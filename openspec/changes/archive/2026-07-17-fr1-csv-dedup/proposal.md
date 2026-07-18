# Proposal: FR-1 Idempotent CSV Ingestion & Deduplication

> Environment: **[production]** — Next.js (App Router) + TypeScript + Tailwind + Vitest.
> Artifact store: **hybrid** (this file + Engram `sdd/fr1-csv-dedup/proposal`).
> Strict TDD: **ACTIVATES HERE** (spec §4 test blocks become gating scenarios).
> Inherits: frozen domain contracts from FR-0 blueprint (`sandbox/src/fixtures.ts` + 3-of-4 component props in `openspec/changes/archive/2026-06-22-fr0-wireframing-sandbox/design.md` §80-99).

## 1. Why

Spec §2 FR-1 mandates idempotent CSV ingestion with SHA-256 deduplication (`Transaction Hash = SHA-256(Date + Cleaned_Description + Amount)`) so overlapping statement downloads cannot skew the dataset. §4 turns the engine into a hard gate: the agent must reject any implementation where the three named test blocks (SHA-256 idempotency, Wants isolation in the Bt formula, fallback classification to `wants.variables`) do not pass natively. Spec §3 then consumes the engine's output to compute the dynamic 6-month Bunker Target ($B_t = C_s \times 6$ with Wants strictly isolated).

The production repo is fully greenfield — no `package.json`, no `app/`, no `src/`, no Vitest config (per FR-0 archive-report §1, `sandbox/` remains the only Node project on disk). FR-1 must bootstrap the production toolchain AND ship the engine in one change. The chosen engine location (Server Actions), store (local JSON with `schemaVersion`), and classification rule (sign-based negative→Wants / positive→Income) are pinned in §4 below.

## 2. What Changes

**Engine (`src/lib/engine/`)**
- `hash.ts` — `sha256(date: ISODate, cleanedDesc: string, amount: number): string`
- `cleanDescription.ts` — deterministic normalization (case fold, whitespace collapse, punctuation strip, merchant-code collapse). **Hashed AFTER normalization.**
- `parseCsv.ts` — raw `Date,Description,Amount` rows → `Transaction`. Header detection + currency-symbol strip.
- `parseDate.ts` — bank-format hints → `ISODate` (YYYY-MM-DD). Normalized BEFORE hashing.
- `classify.ts` — sign-based stub: `amount < 0 → 'wants.variables'`, `amount > 0 → 'income.salary'`. Returns the **deferred FR-2 interface shape** so the swap is a one-file change later.
- `store.ts` — JSON read/write, idempotent upsert keyed by hash, `schemaVersion: 1`.
- `logger.ts` — append-only JSON-line logger to `${BUNKER_DATA_DIR:-/data}/state/ingest.log`.

**Server Actions (`src/app/actions/`)**
- `ingestFromFolder.ts` — scans `${BUNKER_DATA_DIR:-/data}/raw/*.csv`, returns `{ ingested, deduped, skipped, logPath }`. Calls a shared internal `ingestTransactions(rows: Transaction[], ownerId: string): IngestResult`.

> Drag-and-drop ingestion is **NOT in scope for FR-1** (per assumption A4). `ingestFromUpload` Server Action deferred to FR-N. The internal `ingestTransactions(rows, ownerId)` API is acquisition-agnostic and reusable when upload lands.

**Types (`src/lib/types/`)**
- `Transaction { id: string; date: ISODate; description: string; cleanedDescription: string; amount: number; category: CategoryRef; ownerId: string; firstSeenAt: ISODateTime; sourceFile: string; }`
- `PersistedTransactions { schemaVersion: 1; transactions: Transaction[] }`

**Tests (`src/lib/**/__tests__/` + `src/app/actions/__tests__/`)** — see §7.

**Production bootstrap**
- Root `package.json` (Next.js 15 App Router, React 19, TS strict), `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `.eslintrc.json`, `.prettierrc`, `.gitignore`. Single infra work-unit in tasks.md.

**Docs**
- `README.md` documents `BUNKER_DATA_DIR` env var, `/data/raw` + `/data/state` folder contract, idempotency guarantee.

## 3. Scope Boundaries

**In scope (FR-1 ships):**
- Filesystem-only ingest path: `ingestFromFolder` Server Action scanning `${BUNKER_DATA_DIR:-/data}/raw/*.csv`.
- SHA-256 dedup, JSON store with `schemaVersion: 1`, sign-based classification stub.
- Strict TDD: 3 spec §4 blocks + 5 FR-1 blocks (see §7).
- Production bootstrap (Next.js, Vitest, Tailwind, ESLint, Prettier, `.gitignore`).

**Out of scope (deferred):**
- Any UI surface that calls the engine (FR-1 keeps `sandbox/src/fixtures.ts` as the UI source — UI replacement lands in FR-2).
- Regex/keyword classification (FR-2). FR-1 ships the stub interface only.
- Dynamic timeframe math, `BunkerSummary` computation, Bunker Target formula (FR-3).
- Subcategory heuristics (spec §2 FR-2) — sign-based only here.

## 4. Approach

| Decision | Choice | Why |
|---|---|---|
| **Engine location** | **Server Actions** (`'use server'`) | App Router idiom; progressive enhancement; unit-testable as plain async functions (Vitest imports them, no HTTP). Route handlers (B) lose type-safety across the HTTP boundary; client workers (C) split the dedup store from server-side `/data/raw` scans. |
| **Store** | **Local JSON** at `${BUNKER_DATA_DIR:-/data}/state/transactions.json`, `schemaVersion: 1` | Spec FR-1 says "existing local JSON/state database." Zero deps, inspectable with `jq`, trivially testable. SQLite migration is a clean future change if volume exceeds ~10k. |
| **Classification** | **Sign-based stub**: `amount < 0 → Wants` (subcategory `'variables'`), `amount > 0 → Income` (subcategory `'salary'`) | FR-1 only needs to isolate Wants from Bt (§4 block 2). Regex/keyword work is FR-2. The stub returns the **same category shape FR-2 will use** so swapping is one file. |
| **Filesystem-only ingest (FR-1)** | `ingestFromFolder` Server Action scans `${BUNKER_DATA_DIR:-/data}/raw/*.csv` | Per assumption A4: scope is motor + dedup + persistencia, NO UI. Drag-and-drop (spec FR-1 alternative wording) is deferred to FR-N. The internal `ingestTransactions(rows, ownerId)` is acquisition-agnostic, so adding `ingestFromUpload` later is purely additive — no engine change. |
| **Hash order** | Normalize (cleanDescription + parseDate) **BEFORE** hashing | Silent foot-gun: re-importing a date as `DD/MM/YYYY` then `MM/DD/YYYY` must dedup; format-equivalent rows must hash identically. Normalization happens once, before hash input. |
| **Errors** | Skip row + append JSON-line to `${BUNKER_DATA_DIR:-/data}/state/ingest.log` | No silent corruption; ingest log is the audit trail for "why did this row disappear?" |

## 5. API Surface

```ts
// src/lib/types/transaction.ts
export type ISODate = string;        // 'YYYY-MM-DD'
export type ISODateTime = string;    // ISO 8601

export interface Transaction {
  id: string;                         // sha256(date + cleanedDescription + amount)
  date: ISODate;
  description: string;                // raw, untouched (for UI display)
  cleanedDescription: string;         // normalized (the hash input)
  amount: number;                     // sign-bearing: negative = outflow
  category: CategoryRef;              // FR-1: sign-based stub; FR-2 swaps impl
  ownerId: string;                    // A1: default 'self'
  firstSeenAt: ISODateTime;
  sourceFile: string;                 // original CSV path/filename
}

export interface CategoryRef {
  tier: 'income' | 'needs' | 'wants';
  subcategory: string;                // FR-1: 'variables' | 'salary' only
}

// src/lib/types/store.ts
export interface PersistedTransactions {
  schemaVersion: 1;
  owners: Record<string, Transaction[]>;  // keyed by ownerId (A1)
}

// src/lib/types/ingest.ts
export interface IngestResult {
  ingested: number;
  deduped: number;
  skipped: number;                    // malformed rows
  logPath: string;                    // absolute path to ingest.log
  transactionCount: number;           // total persisted after this run
}

// src/lib/engine/hash.ts
export function hashTransaction(input: {
  date: ISODate;
  cleanedDescription: string;
  amount: number;
}): string;                           // sha256 hex

// src/lib/engine/cleanDescription.ts
export function cleanDescription(raw: string): string;   // deterministic, pinned by test

// src/lib/engine/parseCsv.ts
export function parseCsv(raw: string): Transaction[];   // throws on malformed header

// src/lib/engine/parseDate.ts
export function parseDate(raw: string, format?: string): ISODate;  // format hint optional

// src/lib/engine/classify.ts
export function classify(amount: number): CategoryRef;   // FR-1 stub: sign-based

// src/lib/engine/store.ts
export function readStore(dataDir: string, ownerId: string): Promise<Transaction[]>;
export function upsertTransactions(
  dataDir: string,
  ownerId: string,
  candidates: Transaction[]
): Promise<{ added: number; skipped: number }>;

// src/lib/engine/logger.ts
export function appendIngestLog(dataDir: string, event: IngestLogEvent): Promise<void>;

// src/app/actions/ingestFromFolder.ts  (Server Action — FR-1 sole entry point)
export async function ingestFromFolder(input: {
  ownerId?: string;                  // defaults to 'self'
  dataDir?: string;                  // defaults to $BUNKER_DATA_DIR || /data
}): Promise<IngestResult>;

// FR-N (deferred): ingestFromUpload(formData) — internal ingestTransactions is reusable.
```

## 6. W-1 Reconciliation

`AuditSplitProps` was extended additively with `needsLabels` + `wantsLabels` in FR-0 (commit `6aef3e5`, archive-report §6 W-1 OPEN). The explore hypothesis is correct: real CSV data forces a **larger** interface change anyway (transparency + trust metadata), so the right move is one bundled amendment rather than a special-case revert.

**Proposed frozen `AuditSplitProps` (FR-1 production):**

```ts
export interface AuditSplitProps {
  needs: readonly CategoryLine<NeedsSubcategory>[];
  wants: readonly CategoryLine<WantsSubcategory>[];
  optimizationPotential: number;
  // DI labels — kept from FR-0 additive extension (W-1 reconciliation path (b))
  needsLabels: Record<NeedsSubcategory, string>;
  wantsLabels: Record<WantsSubcategory, string>;
  // Real-data metadata — required for spec §3 micro-metadata + trust signals
  sourceFiles: readonly string[];                  // which CSVs fed the dataset
  dateRange: { from: ISODate; to: ISODate };        // drives "X.X months remaining"
  transactionCount: number;                         // context for footer ("out of N...")
  ownerId: string;                                  // A1: which user's data this is
}
```

**Migration story:**
1. FR-1 design records an SDD decision: W-1 is **closed by supersession** with this amendment. The frozen contract is updated in one place (`openspec/changes/fr1-csv-dedup/design.md`).
2. Sandbox `sandbox/src/components/AuditSplit.tsx` updates its props interface to match the new frozen shape (additive — no breakage).
3. The `sandbox/` folder remains a referenceable blueprint (per archive-report §2), but the props contract lives in production from FR-1 onward.
4. No caller exists yet for `AuditSplit` outside the sandbox; the change is local to the props interface and one component.

## 7. Test Plan (Strict TDD — RED → GREEN → REFACTOR per task)

Three blocks mandated by **spec §4** + five FR-1-specific blocks. Every block MUST pass before the implementation task closes.

| # | Block name | File | Asserts |
|---|---|---|---|
| **T-1** | `SHA-256 idempotency` (spec §4 block 1) | `src/lib/engine/__tests__/hash.test.ts` | Parsing the same row twice → 1 persisted; identical `{Date, CleanedDesc, Amount}` → identical hash → skipped. |
| **T-2** | `Wants isolation in Bunker Target` (spec §4 block 2) | `src/lib/engine/__tests__/bunker-target.test.ts` | `survivalMonthlyCost = 1400` → `Bt = 8400`; `wantsTotal = 600` → `Bt` unchanged. Gating: 1400+600 → 8400 not 12000. |
| **T-3** | `Fallback classification to Wants.variables` (spec §4 block 3) | `src/lib/engine/__tests__/classify.test.ts` | Unmapped negative transaction → `wants.variables`. FR-1 stub delegates to the sign-based classifier; the fallback invariant is asserted at the stub boundary. |
| **T-4** | `csv-parser` (FR-1 new) | `src/lib/engine/__tests__/parse-csv.test.ts` | Header detection (`Date`, `Description`, `Amount`), date parsing, amount sign convention, currency-symbol strip (`€`, `$`, `£`). |
| **T-5** | `filesystem-source` (FR-1 new) | `src/app/actions/__tests__/ingest-from-folder.test.ts` | Given `/data/raw/*.csv`, action returns same `Transaction[]` as direct row ingestion; errors skip + log. |
| **T-6** | `store round-trip` (FR-1 new) | `src/lib/engine/__tests__/store.test.ts` | Empty store → ingest 5 rows → 5 persisted; ingest same 5 again → still 5 (idempotency at store level). |
| **T-7** | `cleanDescription determinism` (FR-1 new) | `src/lib/engine/__tests__/clean-description.test.ts` | `"Glovo *Order#123"` and `"GLOVO   *order # 123 "` produce the same cleaned string → same hash. The silent foot-gun that breaks idempotency if not pinned. |
| **T-8** | `owner isolation` (FR-1 new, A1) | `src/lib/engine/__tests__/store.test.ts` | Two owners ingest overlapping CSVs; each `owners[owner_id]` array is independent; hash collisions in one owner's space do not affect the other. |

**Test command**: `vitest run` (per `openspec/config.yaml` `testing.test_command`). Coverage threshold: 0 (greenfield bootstrap phase).

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **`cleanDescription` nondeterminism breaks idempotency silently** (bank merchant codes, casing, trailing punctuation) | High | T-7 pins the normalization contract before T-1 is written; refactor gate in tasks.md before hash impl. |
| **Date format ambiguity** (`DD/MM/YYYY` vs `MM/DD/YYYY` vs `YYYY-MM-DD`) hashes different inputs for same logical date | High | `parseDate` normalizes to `ISODate` BEFORE hash input; format hint is per-bank and defaulted; T-4 + T-7 cover. |
| **Production bootstrap friction** (no `package.json` exists — every config is new) | Med | `tasks.md` groups infra into a single work-unit (Next.js + Vitest + Tailwind + ESLint + Prettier + `.gitignore`) before any engine code. `next dev` + `vitest run` green gate before tasks T-1..T-8 begin. |
| **W-1 amendment grows the change beyond "ingestion + dedup"** | Med | Bound the amendment to `AuditSplitProps` only; the new props are **required** for spec §3 micro-metadata + transparency, not optional polish. Listed as one decision in `design.md`. |
| **JSON store grows unbounded + no concurrent-write protection** | Low | Acceptable at FR-1 scale (hundreds/month per A7); `schemaVersion: 1` enables future SQLite migration without re-parsing existing JSON. |

## 9. Out of Scope for FR-1

- **UI replacement** — `sandbox/src/fixtures.ts` remains the UI source until FR-2. FR-1 ships engine + types only.
- **Drag-and-drop ingest (FR-N)** — Not implemented in FR-1 (assumption A4). When it lands, `ingestTransactions(rows, ownerId)` is the shared internal API; only a thin `ingestFromUpload` Server Action wrapping `FormData` parsing is added.
- **Regex/keyword subcategory heuristics** — spec §2 FR-2 (`restoration`, `subscriptions`, etc.) deferred. FR-1 stub returns `'variables'` for any negative amount.
- **Multi-user accounts / auth** — A1 model has `ownerId` (`'self'` default), but no auth flow.
- **Schema migration beyond v1** — `schemaVersion: 1` declared; no migration logic. FR-2+ branches on it if needed.
- **Dynamic timeframe math** (spec §3 FR-3, `Δ_M`, monthly averages, `B_t`) — engine output (`PersistedTransactions`) is the input FR-3 consumes.
- **`BunkerSummary` computation** — `BunkerFixtures`/`BunkerSummary` types carry forward from FR-0; the function that produces them lands in FR-3.
- **Bunker survival cash position** (`currentCash`, `monthsRemaining`) — user input, not engine output.

## 10. Rollback Plan

1. `rm -rf src/ app/` — engine + actions deleted.
2. `rm package.json package-lock.json next.config.ts tsconfig.json tailwind.config.ts postcss.config.js vitest.config.ts .eslintrc.json .prettierrc` — production toolchain removed.
3. `rm -rf node_modules/ .next/` — build artifacts cleared.
4. `${BUNKER_DATA_DIR:-/data}/state/transactions.json` and `ingest.log` survive but become inert; delete if full reset is desired.
5. `sandbox/` (FR-0 blueprint) is **unaffected** — rollback is local to the production scaffold.
6. `openspec/changes/archive/2026-06-22-fr0-wireframing-sandbox/` is **unaffected**.

## 11. Success Criteria

- [ ] `npm install && npm run dev` boots Next.js on `localhost:3000` with zero errors.
- [ ] `npm test` (alias `vitest run`) reports **8/8** test blocks passing: T-1, T-2, T-3 (spec §4) + T-4, T-5, T-6, T-7, T-8 (FR-1).
- [ ] `tsc --noEmit` exits 0 (strict mode).
- [ ] `next build` exits 0.
- [ ] End-to-end smoke: drop a real CSV in `/data/raw`; `ingestFromFolder` returns `{ ingested, deduped, skipped, logPath }`; re-running the same CSV returns `ingested: 0, deduped: N` (idempotency proven).
- [ ] `openspec/changes/fr1-csv-dedup/proposal.md` exists and is persisted to Engram `sdd/fr1-csv-dedup/proposal`.
- [ ] W-1 is **CLOSED** with the bundled amendment recorded as an SDD decision in `design.md`.
- [ ] `sandbox/` remains a working wireframe blueprint (unchanged from FR-0 archive state).

## 12. Next Step

**`sdd-spec`** — produce FR-1 delta specs with Given/When/Then scenarios for the 8 test blocks, RFC 2119 keywords, and explicit references to spec §2 + §4. Capabilities to create in `openspec/specs/`:
- `csv-ingestion` — `ingestFromFolder` Server Action + filesystem acquisition (drag-and-drop deferred to FR-N).
- `transaction-dedup` — SHA-256 hash + `cleanDescription` + `parseDate`.
- `transaction-store` — local JSON, `schemaVersion: 1`, owner-scoped.