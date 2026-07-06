# Design: FR-1 Idempotent CSV Ingestion & Deduplication

> Environment: **[production]** — Next.js (App Router) + TypeScript + Tailwind + Vitest. Artifact store: **hybrid**.
> Strict TDD: **ACTIVATES HERE**. Spec §4 test blocks become gating scenarios.
> Inherits frozen contracts from FR-0 blueprint (`sandbox/src/fixtures.ts` + 3-of-4 component props in archive `design.md` §80-99).

## Technical Approach

A Server Action (`ingestFromFolder`, `'use server'`) scans `${BUNKER_DATA_DIR:-/data}/raw/*.csv`, routes every parsed row through a shared internal `ingestTransactions(rows, ownerId)` that hashes with SHA-256 (post-normalization: `cleanDescription` + `parseDate`) and upserts into `${BUNKER_DATA_DIR:-/data}/state/transactions.json` keyed by `ownerId` with `schemaVersion: 1`. Classification is a sign-based stub returning the FR-2-shaped `CategoryRef { tier, subcategory }` so the FR-2 swap is a one-file change. A `computeBunkerTarget(survivalMonthlyCost, wantsTotal)` stub at `src/lib/engine/computeBunkerTarget.ts` gives T-2 (Wants isolation, `1400+600 → 8400 not 12000`) a home; FR-3 replaces the body. Three SDD decisions bind the change: W-1 bundled `AuditSplitProps` amendment, the FR-1-only Wants-isolating stub, and the strict-TDD activation gate. Production repo is fully greenfield — FR-1 bootstraps the Next.js + Vitest + Tailwind + ESLint + Prettier scaffold in one infra work-unit before any engine code.

## File Tree

```
bunker-100k/
├── package.json                            # NEW
├── package-lock.json                       # NEW (npm install)
├── next.config.ts                          # NEW
├── tsconfig.json                           # NEW (strict)
├── tailwind.config.ts                      # NEW
├── postcss.config.js                       # NEW
├── vitest.config.ts                        # NEW
├── .eslintrc.json                          # NEW
├── .prettierrc                             # NEW
├── .gitignore                              # extend existing
├── README.md                               # NEW (BUNKER_DATA_DIR docs)
├── app/                                    # NEW — Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                            # placeholder; UI replacement is FR-2
│   └── actions/
│       ├── ingestFromFolder.ts             # 'use server' (sole FR-1 entry point)
│       └── ingestTransactions.ts           # internal shared API (acquisition-agnostic)
├── src/                                    # NEW
│   ├── lib/
│   │   ├── engine/
│   │   │   ├── hash.ts
│   │   │   ├── cleanDescription.ts
│   │   │   ├── parseCsv.ts
│   │   │   ├── parseDate.ts
│   │   │   ├── classify.ts
│   │   │   ├── computeBunkerTarget.ts      # FR-1 stub (Wants isolated)
│   │   │   ├── store.ts
│   │   │   └── logger.ts
│   │   └── types/
│   │       ├── transaction.ts
│   │       ├── store.ts
│   │       └── ingest.ts
│   └── sandbox-bridge/
│       └── frozenContracts.ts              # re-exports BunkerFixtures + 4 frozen props
├── openspec/specs/                         # FR-1 capability specs (already created)
│   ├── csv-ingestion/spec.md               # (FR-1 spec phase)
│   ├── transaction-dedup/spec.md
│   └── transaction-store/spec.md
└── sandbox/                                # UNCHANGED — FR-0 blueprint
```

## Component / Module Responsibilities

| Module | Inputs | Outputs | Pure / Impure | Justification |
|---|---|---|---|---|
| `hash.ts` | `{ date: ISODate; cleanedDescription: string; amount: number }` | `string` (sha256 hex) | **Pure** | No I/O; determinism is the contract. |
| `cleanDescription.ts` | `raw: string` | `string` | **Pure** | Pinned by T-7; foot-gun if nondeterministic. |
| `parseCsv.ts` | `raw: string; sourceFile?: string` | `Transaction[]` (+ writes log via injected logger) | **Pure shape, impure side effects** | Pure parse; side effect injected via `logger` param for testability. |
| `parseDate.ts` | `raw: string; format?: string` | `ISODate` | **Pure** | Deterministic; called **before** hash. |
| `classify.ts` | `amount: number` | `CategoryRef` | **Pure** | Sign-based stub; FR-2 swaps impl. |
| `computeBunkerTarget.ts` | `(survivalMonthlyCost, wantsTotal)` | `number` | **Pure** | FR-1 stub: `survivalMonthlyCost * 6`. FR-3 replaces body. |
| `store.ts` | `dataDir, ownerId, transactions` | `{ added, skipped }` | **Impure** | `node:fs/promises` read/write JSON. |
| `logger.ts` | `dataDir, IngestLogEvent` | `Promise<void>` | **Impure** | Append JSON-line to `ingest.log`. |
| `ingestFromFolder.ts` | `{ ownerId?, dataDir? }` | `IngestResult` | **Impure** | Orchestrator: scan → parse → route to `ingestTransactions`. |
| `ingestTransactions.ts` | `(rows: Transaction[], ownerId: string)` | `IngestResult` | **Impure** | Shared internal: hash → upsert → log. Reused by future FR-N upload path. |

## Data Model

```ts
// src/lib/types/transaction.ts
export type ISODate = string;       // 'YYYY-MM-DD'
export type ISODateTime = string;   // ISO 8601
export interface CategoryRef { tier: 'income' | 'needs' | 'wants'; subcategory: string; }
export interface Transaction {
  id: string;                      // sha256(date + cleanedDescription + amount)
  date: ISODate;
  description: string;             // raw, verbatim (UI display)
  cleanedDescription: string;      // hashed input
  amount: number;                  // sign-bearing: <0 = outflow, >0 = inflow
  category: CategoryRef;
  ownerId: string;                 // A1: defaults to 'self'
  firstSeenAt: ISODateTime;
  sourceFile: string;              // original CSV filename
}

// src/lib/types/store.ts (REQ-STORE-1)
export interface PersistedTransactions {
  schemaVersion: 1;
  owners: Record<string, Transaction[]>;   // keyed by ownerId
}

// src/lib/types/ingest.ts
export interface IngestResult {
  ingested: number;          // new transactions added this run
  deduped: number;           // skipped because hash matched existing
  skipped: number;           // malformed rows (logged to ingest.log)
  logPath: string;           // absolute path to ingest.log
  transactionCount: number;  // total persisted for this owner after this run
}
export interface IngestLogEvent {
  sourceFile: string;
  lineNumber: number;
  reason: 'missing-amount' | 'missing-date' | 'missing-description' | 'unparseable-date' | 'unparseable-amount' | 'unknown';
  rawRow: string;
  at: ISODateTime;
}
```

## API Surface

```ts
// src/lib/engine/hash.ts
export function hashTransaction(input: { date: ISODate; cleanedDescription: string; amount: number }): string;

// src/lib/engine/cleanDescription.ts
export function cleanDescription(raw: string): string;

// src/lib/engine/parseCsv.ts
export function parseCsv(raw: string, sourceFile: string): Transaction[];   // throws on missing header

// src/lib/engine/parseDate.ts
export function parseDate(raw: string, format?: string): ISODate;

// src/lib/engine/classify.ts
export function classify(amount: number): CategoryRef;   // FR-1 stub

// src/lib/engine/computeBunkerTarget.ts (FR-1 stub — see §SDD Decision below)
export function computeBunkerTarget(survivalMonthlyCost: number, wantsTotal: number): number;

// src/lib/engine/store.ts
export function readStore(dataDir: string, ownerId: string): Promise<Transaction[]>;
export function upsertTransactions(
  dataDir: string,
  ownerId: string,
  candidates: Transaction[]
): Promise<{ added: number; skipped: number }>;

// src/lib/engine/logger.ts
export function appendIngestLog(dataDir: string, event: IngestLogEvent): Promise<void>;

// src/app/actions/ingestFromFolder.ts (Server Action — sole FR-1 entry point)
'use server';
export async function ingestFromFolder(input?: {
  ownerId?: string;
  dataDir?: string;
}): Promise<IngestResult>;

// src/app/actions/ingestTransactions.ts (internal — reusable by FR-N upload)
export async function ingestTransactions(rows: Transaction[], ownerId: string): Promise<IngestResult>;
```

## SDD Decision: W-1 Reconciliation

**Context.** FR-0 (commit `6aef3e5`) extended `AuditSplitProps` additively with `needsLabels` + `wantsLabels`. FR-0 archive-report §6 W-1 tracked this as OPEN, reconcilable at FR-1+ design via (a) revert to direct label import, or (b) formally amend the frozen interface. Real CSV data forces a **larger** `AuditSplit` interface change anyway (spec §3 micro-metadata + trust signals need `sourceFiles`/`dateRange`/`transactionCount`).

**Decision.** W-1 is **closed by supersession** with a single bundled amendment recorded in this design. The frozen `AuditSplitProps` from archive `design.md` §98 is **superseded**. The new frozen shape (production) becomes:

```ts
// src/sandbox-bridge/frozenContracts.ts (re-exported; lives in production from FR-1 onward)
import type { CategoryLine, NeedsSubcategory, WantsSubcategory } from 'sandbox/src/fixtures';
export interface AuditSplitProps {
  needs: readonly CategoryLine<NeedsSubcategory>[];
  wants: readonly CategoryLine<WantsSubcategory>[];
  optimizationPotential: number;
  // DI labels — kept from FR-0 additive extension (W-1 path (b))
  needsLabels: Record<NeedsSubcategory, string>;
  wantsLabels: Record<WantsSubcategory, string>;
  // Real-data metadata — required for spec §3 micro-metadata + trust signals
  sourceFiles: readonly string[];                  // which CSVs fed the dataset
  dateRange: { from: ISODate; to: ISODate };        // drives "X.X months remaining"
  transactionCount: number;                         // footer context ("out of N...")
  ownerId: string;                                  // A1: which user's data
}
```

**Migration.** (1) `src/sandbox-bridge/frozenContracts.ts` re-exports the new shape verbatim. (2) `sandbox/src/components/AuditSplit.tsx` updates its props interface to match (additive — no breakage). (3) Sandbox stays a referenceable blueprint; the props contract lives in production from FR-1 onward. (4) No external caller exists; change is local to the props interface + one sandbox component.

**Consequences.** W-1 is permanently closed; future interface changes go through normal SDD decisions. Spec §3 micro-metadata has typed props from day one (no `any`). The frozen-contract location migrates from sandbox to production bridge — sandbox remains the **visual** blueprint, production owns the **typed contract**.

## SDD Decision: computeBunkerTarget Stub

**Context.** Spec §4 block 2 mandates `Bt = 8400` given `Needs=1400, Wants=600` (Wants strictly isolated). The formula needs an **engine home** in FR-1 or T-2 has nowhere to wire. FR-3 owns the full `delta_M + per-tier aggregation` formula but is out of scope here (proposal §9).

**Decision.** Introduce `src/lib/engine/computeBunkerTarget.ts` with this exact body:

```ts
// src/lib/engine/computeBunkerTarget.ts
/**
 * FR-1 stub. Bt = SurvivalMonthlyCost × 6. Wants is the second argument to make the
 * isolation invariant impossible to ignore at every call site, but it is intentionally
 * unused until FR-3 lands the full delta_M + per-tier aggregation logic.
 */
export function computeBunkerTarget(survivalMonthlyCost: number, wantsTotal: number): number {
  return survivalMonthlyCost * 6;
}
```

**Why the stub exists.** T-2 is a gating scenario in spec §4; without a function to test, the gating assertion is a property (`1400+600 → 8400 not 12000`) that needs a name and a signature. The stub gives T-2 a home and gives FR-3 a one-file replacement boundary.

**Why Wants is the second argument even though it's ignored.** Awareness. Every reviewer scanning the signature sees `wantsTotal` and immediately understands the Wants-isolation invariant is load-bearing. Silently omitting the parameter would make FR-3's expanded signature a breaking change. The unused parameter documents the invariant in the type system.

**Consequences.** T-2 wires `computeBunkerTarget(1400, 600) === 8400` (positive gate) and `!== 12000` (negative gate). FR-3 replaces the body without changing the signature; call sites are unaffected.

## Test Architecture

| # | Block | File | Scenario | Spec section |
|---|---|---|---|---|
| **T-1** | SHA-256 idempotency | `src/lib/engine/__tests__/hash.test.ts` | Two CSVs with same logical tx in different formats → 1 stored; identical `{date, cleanedDesc, amount}` → identical `id` | `transaction-dedup` "T-1 SHA-256 idempotency discards duplicate rows" |
| **T-2** | Wants isolation in Bt | `src/lib/engine/__tests__/bunker-target.test.ts` | `computeBunkerTarget(1400, 600) === 8400` and `!== 12000` | `transaction-dedup` "T-2 Wants isolation in Bunker Target — 1400 + 600 → 8400" |
| **T-3** | Fallback classification | `src/lib/engine/__tests__/classify.test.ts` | `classify(-12.50) === {tier:'wants', subcategory:'variables'}`; positive → `income.salary` | `transaction-dedup` "T-3 fallback classification routes unmapped negative amounts to `wants.variables`" |
| **T-4** | csv-parser | `src/lib/engine/__tests__/parse-csv.test.ts` | Header detection; currency strip (€, $, £); thousands sep; malformed row → logged + skipped | `csv-ingestion` "T-4 csv-parser handles standard headers", "T-4 csv-parser strips currency symbols", "T-4 csv-parser skips malformed rows" |
| **T-5** | filesystem-source | `src/app/actions/__tests__/ingest-from-folder.test.ts` | `/data/raw/*.csv` → action returns `{ingested, deduped, skipped, logPath}` honoring `BUNKER_DATA_DIR` + `dataDir` override | `csv-ingestion` "T-5 filesystem-source returns transactions from folder", "T-5 filesystem-source honors `dataDir` override" |
| **T-6** | Store round-trip | `src/lib/engine/__tests__/store.test.ts` | Empty → 5 rows → 5 stored + `schemaVersion: 1`; re-ingest same 5 → `{added: 0, skipped: 5}`; `firstSeenAt` preserved | `transaction-store` "T-6 store round-trip", "T-6 store idempotency" |
| **T-7** | cleanDescription determinism | `src/lib/engine/__tests__/clean-description.test.ts` | `"Glovo *Order#123"` and `"GLOVO   *order # 123 "` → byte-identical cleaned → identical hash | `transaction-dedup` "T-7 cleanDescription is deterministic across case + whitespace + punctuation" |
| **T-8** | Owner isolation | `src/lib/engine/__tests__/owner-isolation.test.ts` (separate file — coverage maps cleanly per file) | `self` + `partner` ingest overlapping CSV → independent `owners[id]` arrays; hash collision in one space never writes the other | `transaction-store` "T-8 owner isolation — overlapping CSVs do not collide across owners" |

T-1/T-7 ordering: T-7 lands **before** T-1 in `tasks.md` (refactor gate before hash impl, per proposal §8 risk 1). Test command: `npm test` → `vitest run`. Coverage threshold: `0` (greenfield).

## Production Bootstrap (infra work-unit)

| File | Purpose |
|---|---|
| `package.json` | Next.js 15 + React 19 + TS + Tailwind + Vitest scripts; `npm test` → `vitest run` |
| `package-lock.json` | Generated by `npm install` (pinned for reproducibility) |
| `next.config.ts` | App Router config; experimental flags off |
| `tsconfig.json` | `strict: true`, `noUncheckedIndexedAccess: true`, `@/` → `./src/*` path alias |
| `tailwind.config.ts` + `postcss.config.js` | Tailwind v3 wiring (content scan `./app/**/*.{ts,tsx}`, `./src/**/*.{ts,tsx}`) |
| `vitest.config.ts` | `environment: 'node'` for engine; `node:fs/promises` available; path alias `@/` |
| `.eslintrc.json` | `next/core-web-vitals` + `@typescript-eslint/recommended-type-checked` |
| `.prettierrc` | 2-space, single quotes, trailing comma `all`, 100-col width |
| `.gitignore` | `node_modules/`, `.next/`, `coverage/`, `*.log`, `${BUNKER_DATA_DIR:-/data}` (excluded if repo-local) |
| `README.md` | Documents `BUNKER_DATA_DIR`, `/data/raw` + `/data/state` contract, idempotency guarantee |
| `app/layout.tsx` | Root layout (Tailwind import, no UI yet) |
| `app/page.tsx` | Placeholder (`<main>Bunker-100k — engine ready.</main>`); UI replacement deferred to FR-2 |

`npm run dev` (`localhost:3000`) + `npm test` green gate **before** any T-1..T-8 task starts.

## Sandbox Bridge

`sandbox/` is Vite-based with own `package.json`; it cannot share Node modules with Next.js. The bridge is **type re-exports only**, not code:

```ts
// src/sandbox-bridge/frozenContracts.ts
// Re-exports FR-0 frozen contracts so production imports typed shape without copying.
export type {
  Eur,
  NeedsSubcategory,
  WantsSubcategory,
  CategoryLine,
  BunkerSummary,
  BunkerFixtures,
} from '../../sandbox/src/fixtures';

// NEW: production-authoritative AuditSplitProps (supersedes FR-0 frozen shape — see §W-1)
export interface AuditSplitProps {
  needs: readonly CategoryLine<NeedsSubcategory>[];
  wants: readonly CategoryLine<WantsSubcategory>[];
  optimizationPotential: number;
  needsLabels: Record<NeedsSubcategory, string>;
  wantsLabels: Record<WantsSubcategory, string>;
  sourceFiles: readonly string[];
  dateRange: { from: import('../lib/types/transaction').ISODate; to: import('../lib/types/transaction').ISODate };
  transactionCount: number;
  ownerId: string;
}
// BunkerHeaderProps, BunkerHeroProps, MacroGridProps — re-exported verbatim from sandbox/src/components (post-FR-2).
```

**Rationale.** Sandbox remains visual reference; production owns typed contracts from FR-1 onward. Re-export (not copy) keeps the single source of truth at `fixtures.ts` while letting Next.js's `tsc` see the types in `node_modules`-style resolution. When the FR-2 UI lands, components import `@/sandbox-bridge/frozenContracts` for props types only — sandbox stays untouched.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **`cleanDescription` nondeterminism silently breaks idempotency** (case, whitespace, merchant codes, trailing order IDs) | High | T-7 lands **before** T-1 in `tasks.md`; refactor gate enforced; T-1 fails loudly if T-7 regresses. |
| **Date format ambiguity** (`DD/MM/YYYY` vs `MM/DD/YYYY` vs `YYYY-MM-DD`) hashes different inputs for same logical date | High | `parseDate` normalizes to `ISODate` BEFORE hash; per-bank format hint optional; T-1 includes format-cross-dedup fixture. |
| **Production bootstrap friction** (no `package.json` exists — every config file is new) | Med | `tasks.md` infra work-unit gates `npm run dev` + `npm test` green before any T-1..T-8 starts. |
| **W-1 amendment scope creep** (bundled change could grow beyond "ingestion + dedup") | Med | Bounded to `AuditSplitProps` only; the 5 new fields are **required** for spec §3 micro-metadata + transparency, not optional polish. |
| **T-2 engine home + T-3→FR-2 hand-off** (computeBunkerTarget stub bleeds into FR-3; classify stub delegate pattern could mislead FR-2 implementation) | Med | `computeBunkerTarget` stub comment is explicit; `classify` returns `CategoryRef` shape (not raw signs) so FR-2's keyword matcher is a one-file swap at the same boundary. |
| **JSON store concurrent-write race** (two Server Actions in flight overlap) | Low | Acceptable at FR-1 scale (hundreds/month per A7); `schemaVersion: 1` enables future SQLite migration. |

## Rollback Plan

1. `rm -rf app/ src/` — engine + actions deleted.
2. `rm package.json package-lock.json next.config.ts tsconfig.json tailwind.config.ts postcss.config.js vitest.config.ts .eslintrc.json .prettierrc` — toolchain removed.
3. `rm -rf node_modules/ .next/ coverage/` — build artifacts cleared.
4. `${BUNKER_DATA_DIR:-/data}/state/transactions.json` + `ingest.log` survive but become inert; delete for full reset.
5. `sandbox/` (FR-0 blueprint) — **unaffected**.
6. `openspec/changes/archive/2026-06-22-fr0-wireframing-sandbox/` — **unaffected**.
7. `openspec/specs/{csv-ingestion,transaction-dedup,transaction-store}/` — survive (rolled back via `sdd-archive` if needed; they remain valid capability specs).

## Out of Scope

Matches proposal §9 (verbatim):

- **UI replacement** — `sandbox/src/fixtures.ts` remains UI source until FR-2.
- **Drag-and-drop ingest (FR-N)** — assumption A4. `ingestTransactions(rows, ownerId)` is the shared internal API; `ingestFromUpload` is a thin `FormData` wrapper deferred to FR-N.
- **Regex/keyword subcategory heuristics** — spec §2 FR-2 (`restoration`, `subscriptions`, etc.). FR-1 stub returns `'variables'` for any negative amount.
- **Multi-user accounts / auth** — A1 `ownerId` model; no auth flow.
- **Schema migration beyond v1** — `schemaVersion: 1` declared; no migration logic.
- **Dynamic timeframe math** (spec §3 FR-3, `Δ_M`, monthly averages) — `PersistedTransactions` is the input FR-3 consumes.
- **`BunkerSummary` computation** — `computeBunkerTarget` is a stub; full derivation lands in FR-3.
- **Bunker survival cash position** (`currentCash`, `monthsRemaining`) — user input, not engine output.

---

**Next step**: `sdd-tasks` — break FR-1 into infra work-unit (bootstrap) + T-7 (cleanDescription deterministic) → T-1 (hash + ingestTransactions) → T-3 (classify stub) → T-2 (computeBunkerTarget stub) → T-4 (parseCsv) → T-5 (ingestFromFolder) → T-6 (store round-trip) → T-8 (owner isolation). Strict TDD: every task closes only when its scenario is green.
