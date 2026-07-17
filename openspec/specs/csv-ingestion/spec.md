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