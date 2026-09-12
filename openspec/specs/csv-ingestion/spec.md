# CSV Ingestion Specification

## Purpose

Specifies how BKR-100 acquires transactions from local CSV files. Anchored to spec.md §2 FR-1 (filesystem scan at `/data/raw`) and §4 (TDD blocks T-4 + T-5). This is the sole production ingest surface in FR-1 — drag-and-drop is deferred to FR-N per assumption A4 — and it feeds the shared internal `ingestTransactions(rows, ownerId)` engine. The capability owns row parsing, malformed-row audit logging, and the single Next.js Server Action entry point.

## Requirements

### REQ-CSV-1: Folder Acquisition Path
- The system MUST scan `${BUNKER_DATA_DIR:-/data}/raw/*.csv` for input files per spec §2 FR-1.
- When the `BUNKER_DATA_DIR` environment variable is unset, the system MUST default `dataDir` to `/data`.
- The folder path MUST be overridable via the `dataDir` parameter for deterministic tests.
- Non-`.csv` files in the folder MUST be ignored.

### REQ-CSV-2: CSV Header & Row Shape
- The system MUST accept CSVs whose header row contains the columns `Date`, `Description`, and `Amount`, matched case-insensitively.
- The system MUST strip currency symbols `€`, `$`, and `£` from the `Amount` field.
- The system MUST tolerate thousands separators (`,` or `.` per locale) and parse `Amount` to a signed `number`.
- The system MUST preserve sign convention per spec §2 FR-1: negative = outflow, positive = inflow.
- The original `description` MUST be preserved verbatim alongside the normalized `cleanedDescription`.

### REQ-CSV-3: Malformed-Row Audit Trail
- The system MUST skip any row that fails to parse (missing column, unparseable date, unparseable amount).
- The system MUST append a JSON-line event to `${BUNKER_DATA_DIR:-/data}/state/ingest.log` per skipped row, including `sourceFile`, `lineNumber`, `reason`, and the raw row content.
- Skipped rows MUST NOT abort the ingestion of the rest of the file.

### REQ-CSV-4: Engine Handoff
- The system MUST route every parsed row through the shared internal API `ingestTransactions(rows: Transaction[], ownerId: string)`.
- No client-side CSV parsing is permitted in FR-1.

### REQ-CSV-5: Server Action Surface
- The system MUST expose `ingestFromFolder({ ownerId?, dataDir? }): Promise<IngestResult>` as a Next.js Server Action (`'use server'`).
- The action MUST default `ownerId` to `'self'` per assumption A1.
- The action MUST return `{ ingested, deduped, skipped, logPath, transactionCount }`.

### REQ-CSV-6: Browser Upload Server Action
- The system MUST expose `ingestFromUpload(formData: FormData): Promise<IngestResult>` as a Next.js Server Action (`'use server'`). The action MUST:
- 1. Read all files via `formData.getAll('files')` — supports single AND multi-file uploads.
- 2. For each file: read text → `parseCsv(content)` → `ingestTransactions(rows, ownerId, file.name)` → `upsertTransactions`.
- 3. Aggregate `IngestResult` across files: `ingested` = sum, `deduped` = sum, `skipped` = sum. `logPath` is ALWAYS the canonical ingest log path resolved via `resolveDataDir() + '/state/ingest.log'` (single source of truth shared with `ingestFromFolder`) — NEVER derived from uploaded filenames, since uploads have no parent directory.
- 4. Preserve dedup parity with `ingestFromFolder` (U2) — re-uploading the same CSV MUST return `ingested: 0, deduped: N`.
- 5. Per-file processing failures MUST be appended to `state/ingest.log` per REQ-CSV-3, NOT thrown to the client.

#### Scenario: T-9 happy path — single file
- GIVEN `formData` with one CSV (3 valid rows), store empty
- WHEN `ingestFromUpload` runs
- THEN result is `{ ingested: 3, deduped: 0, skipped: 0, logPath, transactionCount: 3 }`.

#### Scenario: T-9 multi-file dispatch
- GIVEN `formData` with two CSVs (2 rows + 3 rows)
- WHEN `ingestFromUpload` runs in one call
- THEN result aggregates both: `ingested: 5`, `logPath` points to first file's parent dir.

#### Scenario: T-9 empty/missing file
- GIVEN `formData` with no files or one empty file
- WHEN `ingestFromUpload` runs
- THEN result is `{ ingested: 0, deduped: 0, skipped: 0, logPath, transactionCount: 0 }` — no throw.

#### Scenario: T-9 malformed CSV
- GIVEN `formData` with a CSV containing one row missing `Amount`
- WHEN `ingestFromUpload` runs
- THEN `skipped > 0`, `state/ingest.log` gains a JSON-line entry, valid rows still ingest.

#### Scenario: T-9 dedup vs existing store
- GIVEN store already contains 5 transactions; user uploads the same CSV again
- WHEN `ingestFromUpload` runs
- THEN result is `{ ingested: 0, deduped: 5, skipped: 0, ... }` (parity with `ingestFromFolder`).

### REQ-CSV-7: Smart CSV Ingest with Auto-Detection
- The system MUST expose `parseCsvAdaptive(raw: string): CsvRow[]` as a pure function in `src/lib/engine/parseCsvAdaptive.ts`. It MUST accept zero configuration and MUST delegate to the unchanged `parseCsv` after normalization. `parseCsv` and `parseDate` are NOT modified.

#### REQ-CSV-7.1 — BOM strip
- The wrapper MUST inspect `raw.charCodeAt(0)`. If it equals `0xFEFF` (UTF-8 BOM `EF BB BF`), the wrapper MUST slice off the BOM (`raw = raw.slice(1)`) before any line splitting. Step is a no-op for BOM-less input.

#### REQ-CSV-7.2 — Header signature scan
- The wrapper MUST walk the first ≤20 **non-empty** lines (skipping blanks). A line qualifies as the header iff it contains tokens that resolve through the synonym table to **all three** canonical slots (`date`, `description`, `amount`) in the same row. If no qualifying row is found within 20 non-empty lines, the wrapper MUST throw: `'No CSV header found in first 20 rows — columns Date/Description/Amount not detected'`.

#### REQ-CSV-7.3 — Date format detection
- Once the header is located, the wrapper MUST sample the resolved date column (first 3 non-empty data rows) and apply, in order:
- 1. If any sampled date matches `^\d{4}-\d{2}-\d{2}$` → **`YYYY-MM-DD`** (ISO wins outright).
- 2. Else if any sampled date matches `^\d{2}/\d{2}/\d{4}$` AND a Spanish header token is present → **`DD/MM/YYYY`**.
- 3. Else → **`MM/DD/YYYY`** default.
- Spanish header tokens: any of `fecha`, `valor`, `concepto`, `importe`, `operacion`, `operación` (post-normalization).

#### REQ-CSV-7.4 — Locale detection
- The wrapper MUST sample the resolved amount column (first 3 non-empty data rows). Apply, in order:
- 1. If any sampled amount contains `,` as decimal separator (i.e. `,` appears after digits and `.` does not appear as decimal in that cell) → **`ES` locale**.
- 2. Otherwise → **`EN` locale**.
- 3. **Ambiguous single-row fallback:** if there is exactly one non-empty amount row AND a Spanish header token is present → default to **`ES`**.

#### REQ-CSV-7.5 — Column mapping (synonym table)
- The wrapper MUST map header tokens to canonical slots using the synonym table. Accepted tokens per slot (post-normalization — lowercase, NFD diacritic-strip, whitespace-collapsed, trimmed):
- **date slot:** `date`, `fecha`, `fecha valor`, `fecha operacion`, `f.operacion`, `fec. valor`, `value date`, `booking date`
- **description slot:** `description`, `concepto`, `descripcion`, `descripción`, `detalle`
- **amount slot:** `amount`, `importe`, `importe eur`, `cantidad`, `value`
- Header matching is case-insensitive, accent-insensitive (NFD normalize + strip diacritics), and whitespace-trimmed.

#### REQ-CSV-7.6 — Value-date preference
- When the date slot maps to multiple candidate columns (e.g. both `FECHA OPERACIÓN` and `FECHA VALOR` are present), the wrapper MUST prefer the column whose normalized header contains `valor` or `value` over one containing `operación` / `operacion` / `booking`. If no preference can be resolved, the wrapper MUST fall back to the **rightmost** date column (last match wins).

#### REQ-CSV-7.7 — Forward to `parseCsv`
- Once date format, locale, and column map are resolved, the wrapper MUST reconstruct a normalized 3-column CSV string containing only the resolved `Date`, `Description`, `Amount` columns (selected from the original file's columns) and delegate to the unchanged `parseCsv`: `parseCsv(normalized, { locale, dateFormat })`. The `parseCsv` function is called with NO modifications. `parseDate` is called via the existing `dateFormat` option.

#### REQ-CSV-7.8 — Backward-compat guarantee (regression gate)
- `parseCsvAdaptive(strictCsv)` where `strictCsv = "Date,Description,Amount\n2026-01-01,Foo,1.00\n"` MUST return a `CsvRow[]` deep-equal (row by row, field by field) to `parseCsv(strictCsv)` invoked with the same defaults. The 7-scenario `parse-csv.test.ts` MUST stay green with zero modifications. The wrapper MUST NOT throw for any input that the unmodified `parseCsv` accepts.

### REQ-CSV-7.9 — `CSV_HEADER_SYNONYMS` named export
- The system MUST expose, from `src/lib/engine/csvHeaderSynonyms.ts`, the named export:
  ```ts
  export const CSV_HEADER_SYNONYMS: Readonly<Record<CanonicalSlot, readonly string[]>>
  export type CanonicalSlot = 'date' | 'description' | 'amount'
  ```
- The values MUST be lowercase, accent-stripped, whitespace-collapsed tokens exactly as enumerated in REQ-CSV-7.5. The export MUST be `readonly` — runtime mutation is forbidden. The module is pure (no I/O, no clock).

### REQ-CSV-7.10 — `normalizeHeader` pure helper
- The system MUST expose `export function normalizeHeader(raw: string): string`. The function MUST apply, in order: NFD-decompose → strip combining diacritics (Unicode category Mn) → lowercase → collapse internal whitespace to a single space → trim leading/trailing whitespace. It MUST be pure (same input → same output, no I/O).

## Scenarios

#### Scenario: T-4 csv-parser handles standard headers (spec §4 RED-GATE)
- GIVEN a CSV with headers `Date,Description,Amount` (and a second fixture with lowercase `date,description,amount`)
- WHEN `parseCsv(raw)` runs against each fixture
- THEN every row is converted into a `Transaction` with `date` as `ISODate` (YYYY-MM-DD), `amount` as a signed `number`, and `description` preserved verbatim

#### Scenario: T-4 csv-parser strips currency symbols and thousands separators
- GIVEN rows containing `"€1,200.50"`, `"$3.000,00"`, `"£42.00"`, and `"-€50.00"`
- WHEN `parseCsv` parses them
- THEN the resulting `amount` values are `1200.50`, `3000.00`, `42.00`, and `-50.00` respectively
- AND signs are preserved

#### Scenario: T-4 csv-parser skips malformed rows and logs JSON-line events
- GIVEN a CSV with a row missing the `Amount` field
- WHEN the file is ingested
- THEN that row is absent from the parsed output
- AND a JSON-line event is appended to `ingest.log` carrying `sourceFile`, `lineNumber`, `reason: 'missing-amount'`, and the raw row
- AND ingestion continues for the remaining rows

#### Scenario: T-5 filesystem-source returns transactions from folder (spec §4 RED-GATE)
- GIVEN `/data/raw` contains `june.csv` and `july.csv`
- WHEN `ingestFromFolder({ ownerId: 'self' })` runs
- THEN all valid rows from both files flow through `ingestTransactions` in a single call
- AND the returned `IngestResult` reflects the union of both files

#### Scenario: T-5 filesystem-source honors `dataDir` override and `BUNKER_DATA_DIR` env var
- GIVEN `BUNKER_DATA_DIR=/srv/bunker` and the `dataDir` parameter is unset
- WHEN `ingestFromFolder({ ownerId: 'self' })` runs
- THEN the action scans `/srv/bunker/raw/*.csv`
- AND when called with `{ dataDir: '/tmp/test' }`, the env var is overridden for that invocation only

#### Scenario: T-13 — header synonym lookup (REQ-CSV-7.9 + REQ-CSV-7.10)
- GIVEN the synonym table + `normalizeHeader` helper
- WHEN `slotForHeader` is invoked with EN canonical (`date`), ES canonical (`fecha`), case variants (`DATE`, `FECHA`), accent variants (`descripción`, `operación`), whitespace-padded (`  fecha  valor  `), Santander-specific (`importe eur`), and unknown (`xyz`, `saldo`, `balance`, `iban`) inputs
- THEN each input resolves to its canonical slot, accent-stripped, whitespace-collapsed, trimmed, or returns `null` for unknowns

#### Scenario: T-14 — adaptive parseCsvAdaptive end-to-end (REQ-CSV-7.1..7.8)
- GIVEN a CSV input (BOM-stripped, with 7-line preamble, or with Spanish/English header)
- WHEN `parseCsvAdaptive(raw)` runs
- THEN the wrapper strips the BOM, scans the first ≤20 non-empty lines for an all-three-slots signature, applies value-date preference (FECHA VALOR > FECHA OPERACIÓN), detects date format (ISO > DD/MM ES > MM/DD), detects locale (`,` decimal → ES; `.` decimal → EN), normalizes to a 3-column CSV, and forwards to `parseCsv` with the detected `{ locale, dateFormat }` options. Crucially, the wrapper NEVER duplicates parsing logic — it normalizes and forwards. Every T-14 scenario asserts **expected amounts** (e.g. `amount === -13.30`), never just row counts, to mitigate R7 silent misclassification.

## Tests

| Block  | File                                                              | Scenarios                                                                                                                                                                                                                                                                |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-4    | `src/lib/engine/__tests__/parse-csv.test.ts`                      | header detection, currency strip, malformed rows, extra columns                                                                                                                                                                                                         |
| T-5    | `src/app/actions/__tests__/ingest-from-folder.test.ts`            | folder scan + IngestResult, dataDir override + BUNKER_DATA_DIR env var                                                                                                                                                                                                  |
| T-9    | `src/app/actions/__tests__/ingest-from-upload.test.ts`            | happy path single file, multi-file dispatch, empty/missing file, malformed CSV → skipped + log, dedup vs existing store                                                                                                                                                  |
| T-13   | `src/lib/engine/__tests__/csv-header-synonyms.test.ts`            | EN canonical token, ES canonical token, mixed EN+ES, case-insensitivity, whitespace tolerance, accent stripping, unknown token → `null`, `normalizeHeader` purity                                                                                                                                     |
| T-14   | `src/lib/engine/__tests__/parse-csv-adaptive.test.ts`             | BOM strip; preamble skip; ES header detection; EN header detection; value-date preference (Santander 2-date-column); locale auto-detect ES + EN; **strict-format passthrough regression** (deep-equal vs `parseCsv`); malformed header → throws; empty file → `[]`; 5-column Santander end-to-end; single-row ambiguous locale; quoted-field-with-comma; single-date-column fallback |