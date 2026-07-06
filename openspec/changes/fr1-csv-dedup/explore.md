# Exploration: FR-1 Idempotent CSV Ingestion & Deduplication

> Environment: **[production]** — Next.js (App Router) + TypeScript + Tailwind + Vitest.
> Scope: ingest real CSVs, build the SHA-256 dedup engine, wire it to the BKR-100 domain model that FR-0 froze.
> Artifact store: hybrid (this file + Engram `sdd/fr1-csv-dedup/explore`).
> Strict TDD: **ACTIVATES HERE** — spec §4 test blocks now bite (they did not apply to FR-0).

---

## Context Snapshot

FR-0 (`openspec/changes/archive/2026-06-22-fr0-wireframing-sandbox/`, archived as a layout blueprint — NOT merged into production specs) produced a typed domain seed (`BunkerFixtures` + `BunkerSummary` + `CategoryLine<K>` + 7 subcategory literals) and 4 wireframe components with 3-of-4 frozen props interfaces matched exactly. W-2 (inline labels in `AuditSplit`) was closed by `a37653a`; **W-1 (`AuditSplitProps` extended with `needsLabels` / `wantsLabels`) remains OPEN** and is tracked for reconciliation at or before the FR-1 production design phase. The sandbox itself stays in the repo as a referenceable blueprint but is inert — `sandbox/src/fixtures.ts` exports a static object that the production change will replace with real, dedup'd CSV data flowing through the engine. Strict TDD (`strict_tdd: true` in `openspec/config.yaml`) was explicitly deferred for FR-0 (visual checkpoint) and **activates at FR-1**, where the three mandated test blocks (SHA-256 idempotency, Wants isolation 1400+600→8400, fallback classification) become gating scenarios.

---

## Current State

The production codebase is **greenfield**. The repo root contains only `spec.md`, `.atl/`, `.git/`, `openspec/`, and the inert `sandbox/` folder — **no root `package.json`, no `next.config.*`, no `app/`, no `src/`**. There is no production code to refactor; everything FR-1 needs is being created from scratch. The Vite sandbox is the only Node project on disk (`sandbox/package.json`, `sandbox/node_modules/`), and it intentionally does not share tooling with the Next.js app. Vitest is already chosen over Jest (`config.yaml` `runner_choice_note`) because the sandbox is Vite-based — but in production Vitest pairs cleanly with Next.js via `vite-tsconfig-paths` or a standalone `vitest.config.ts`, so no re-evaluation is required.

Inputs FR-1 inherits from FR-0 (frozen, must reference, may extend via SDD decision):

- **Domain types** (from `sandbox/src/fixtures.ts`, copy as-is into production): `Eur`, `NeedsSubcategory`, `WantsSubcategory`, `CategoryLine<K>`, `BunkerSummary`, `BunkerFixtures`.
- **Component props** (frozen base interfaces, see `design.md` §80-99 of the archive):
  - `BunkerHeaderProps { title; status }` — exact ✅
  - `BunkerHeroProps { bunkerTarget; currentCash; progressPercent; monthsRemaining; survivalMonthlyCost }` — exact ✅
  - `MacroGridProps { cards: readonly { label; value; trend }[] }` (exactly 3) — exact ✅
  - `AuditSplitProps { needs; wants; optimizationPotential }` — ⚠️ extended (+`needsLabels`, +`wantsLabels`) → **W-1 OPEN**
- **UI strings** (from `sandbox/src/labels.ts`): `HERO_TITLE`, section titles, macro labels, `NEEDS_LABELS` / `WANTS_LABELS` maps, micro-metadata templates. Production should re-import or re-declare these — they're view-layer constants.

---

## CSV Ingest Path Options

Spec FR-1 input line: *"scan a local folder `/data/raw` or receive files via a drag-and-drop zone."* The spec uses "or" — both paths are in-scope, only one is mandatory. Three real approaches:

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. Filesystem `/data/raw` only** | Matches the lowest-friction developer flow (drop CSVs in a folder, hit "refresh"); trivial to seed in CI tests (`tests/fixtures/*.csv` → `/data/raw`); uses `node:fs/promises` synchronously inside a Server Action; no browser required. | Drag-and-drop path from spec is partially unmet (it's "or", but the drag-and-drop story is a UX win the spec explicitly mentions). | Low |
| **B. Drag-and-drop only** | Pure browser experience; no path setup required per machine; works in sandboxed dev environments. | Requires `FileReader` + `FormData` + a server endpoint to receive the upload; the canonical `/data/raw` flow from spec is unmet; harder to CI-test without a browser harness. | Medium |
| **C. Both (filesystem primary + drag-and-drop via a thin upload action)** | Meets the spec verbatim ("`/data/raw` or drag-and-drop"); the **engine is source-agnostic** — both acquisition paths produce the same `Transaction[]` shape; one dedup pass, one store write; minor code duplication (two acquisition functions), one shared engine. | Two ingest functions to test; CI must seed both a folder and a multipart payload; ~30 extra lines of plumbing. | Medium |

**Recommendation: C (both).** The spec explicitly names both paths. Because the engine is acquisition-agnostic (consumes `Transaction[]`), the incremental cost of supporting both is small and the test surface is the same engine. Drop `/data/raw` scanning behind a Server Action; drag-and-drop is a `<form action={uploadAction} encType="multipart/form-data">` posting to the same engine. The two paths share the **same hashing + classification + store** layer, so the FR-1 test suite asserts the engine is correct once, not twice.

---

## Engine Location Options

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. Next.js Server Actions** (`'use server'`, colocated with routes) | Idiomatic App Router pattern; type-safe via shared TS types; progressive enhancement (works without JS); trivially callable from a client component via `useTransition`; **clean unit-test surface** — the action is a function `(transactions: Transaction[]) => PersistedTransactions` and can be imported into Vitest without HTTP. | Tied to Next.js runtime; cannot be called from a plain Node CLI without `next` loaded. | Low |
| **B. Route Handler** (`app/api/ingest/route.ts`) | RESTful, language-agnostic; easy to curl; no React coupling. | Less idiomatic for App Router in 2026; loses progressive enhancement; harder to share types with the UI (HTTP boundary = serialization). | Low |
| **C. Client worker (Web Worker / Service Worker)** | Offloads hashing from main thread; can run without a server. | Hashes computed client-side can't share a store with server-side ingest from `/data/raw` → split-brain dedup; contradicts "local-first" server-side JSON store; can't read filesystem; CI requires a browser harness. | High |

**Recommendation: A (Server Actions).** The BKR-100 engine is fundamentally a **server-side** function (filesystem + JSON store), so the runtime location is settled. Between A and B, A wins on App Router idiom, progressive enhancement, and — most importantly — **unit-test ergonomics**: a Server Action is a plain async function; Vitest can import and call it directly with a fixture `Transaction[]`. Route handlers need HTTP plumbing in tests. Client workers (C) are rejected because the dedup store must be shared across acquisition paths and survives server restarts.

Layout sketch:

```
src/lib/engine/
  hash.ts              // sha256(date + cleanedDesc + amount)
  cleanDescription.ts  // deterministic string normalization (FR-1 critical detail)
  parseCsv.ts          // raw row → Transaction
  classify.ts          // (deferred to FR-2 — stub interface in FR-1)
  store.ts             // JSON read/write, idempotent upsert
src/app/actions/
  ingestFromFolder.ts  // Server Action: scans /data/raw
  ingestFromUpload.ts  // Server Action: receives FormData
```

---

## Dedup Store Options

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| **A. Local JSON file** (e.g., `/data/state/transactions.json`) | Matches spec FR-1 verbatim (*"existing local JSON/state database"*); inspectable with `cat`/`jq`; zero dependencies; works inside Server Actions via `node:fs/promises`; trivially testable (write fixture JSON, assert ingest preserves it). | No concurrent-write protection (single-user app, acceptable); grows unbounded (compaction is a future FR, not FR-1's problem); no queries (acceptable at FR-1's scale). | Low |
| **B. IndexedDB (client-side)** | Browser storage with large quotas; works offline. | Split-brain with the server-side `/data/raw` flow; no shared dedup across acquisitions; can't be unit-tested without a browser harness; doesn't match the spec's "local JSON/state database" wording. | High |
| **C. Filesystem SQLite (`better-sqlite3`)** | Queryable, ACID, scales. | Native dependency inside Next.js Server Actions adds operational weight; overkill for FR-1's scale (hundreds to low-thousands of transactions per typical CSV); the spec says JSON, not SQLite. | Medium |

**Recommendation: A (JSON file).** Spec-aligned, zero-dependency, inspectable, testable. Migration to SQLite is a clean future change if transaction counts exceed ~10k.

Store contract sketch:

```ts
// src/lib/engine/store.ts
interface PersistedTransactions {
  schemaVersion: 1;        // forward-compat for FR-2+ migrations
  transactions: Transaction[]; // each carries its sha256 hash
}
```

---

## Test Block Placement Map

Strict TDD activates. Every behavior below is RED → GREEN → REFACTOR before the implementation task closes.

| Mandated scenario | Spec § | Test file (proposed path) | Asserts |
|---|---|---|---|
| **SHA-256 idempotency** | §4 block 1 | `src/lib/engine/__tests__/hash.test.ts` | Parsing the same row twice yields 1 persisted transaction; identical `{Date, CleanedDesc, Amount}` → identical hash → skipped. |
| **Wants isolation in Bt formula** | §4 block 2 | `src/lib/engine/__tests__/bunker-target.test.ts` | Given `survivalMonthlyCost = 1400`, `Bt = 8400`; given `wantsTotal = 600`, `Bt` unchanged. The fixture `Needs=1400 + Wants=600 → 8400 not 12000` is the gating assertion. |
| **Fallback classification to `Wants.variables`** | §4 block 3 | `src/lib/engine/__tests__/classifier.test.ts` | An unmapped negative transaction is bucketed `wants.variables` (FR-2 dependency — FR-1 stubs the interface and asserts the stub delegates to a default classifier). |

FR-1-specific test blocks (new behavior, not mandated by §4 but enforced by `strict_tdd: true`):

| Behavior | Test file | Asserts |
|---|---|---|
| CSV row → `Transaction` shape | `src/lib/ingest/__tests__/csv-parser.test.ts` | Header detection, date parsing, amount sign convention, currency-symbol strip. |
| Folder scan ingestion | `src/lib/ingest/__tests__/filesystem-source.test.ts` | Given `/data/raw/*.csv`, action returns same `Transaction[]` as direct row ingestion. |
| Drag-and-drop acquisition | `src/lib/ingest/__tests__/upload-source.test.ts` | `FormData` with one or more CSV files produces the same `Transaction[]` shape as the folder scan. |
| JSON store round-trip | `src/lib/engine/__tests__/store.test.ts` | Read empty → ingest 5 rows → 5 persisted; ingest same 5 again → still 5 (idempotency at the store level). |
| `cleanDescription` determinism | `src/lib/engine/__tests__/clean-description.test.ts` | `"Glovo *Order#123"` and `"GLOVO   *order # 123 "` produce the same cleaned string → same hash (this is the silent foot-gun that breaks idempotency if not pinned). |

`vitest.config.ts` will use `node` environment for engine tests and `jsdom` only if FR-1 ever renders anything client-side (it doesn't — server-only engine).

---

## W-1 Reconciliation Hypothesis

`AuditSplitProps` was extended additively with `needsLabels` and `wantsLabels` to support dependency injection during the FR-0 wireframe. In production, `NEEDS_LABELS` and `WANTS_LABELS` are static module-level constants — there's no reason for them to be props. Two resolution paths:

1. **Revert to direct import inside `AuditSplit`** (option (a) in the verify-report). `AuditSplit.tsx` does `import { NEEDS_LABELS, WANTS_LABELS } from '@/lib/labels'` and uses them inline. The frozen interface is restored 1:1. Cost: loses DI testability, but the component is a leaf view — there's no test that benefits from injected labels today.
2. **Formally amend the frozen interface** (option (b)). Document a one-line SDD decision in `fr1-csv-dedup/proposal.md` accepting the additive superset as the new frozen shape. Keep DI for future i18n flexibility.

**Hypothesis**: real CSV data will force a **larger** interface change in FR-1 anyway. Production `AuditSplit` will need at minimum:

- `sourceFiles: readonly string[]` — which CSV files fed the dataset (trust/transparency)
- `dateRange: { from: ISODate; to: ISODate }` — drives the §3 "X.X months remaining" copy
- `transactionCount: number` — context for the optimization potential ("out of N transactions…")

So W-1 is unlikely to be resolved in isolation; the right move is to **defer W-1 to a single, bundled interface-amendment decision in FR-1's design phase** that updates the frozen contract to include both the DI labels AND the new metadata props. This collapses W-1 into a normal SDD decision rather than a special-case revert. **Recommended**: option (2) + amendment, rolled into FR-1 design.

---

## Risks

- **Hash foot-gun on `cleanDescription`**: any nondeterminism (case, whitespace, trailing punctuation, bank-specific merchant codes) breaks idempotency. Mitigation: pin the normalization function with its own TDD block before the hash function.
- **Date format ambiguity**: bank CSVs use `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD` interchangeably. Must normalize BEFORE hashing or two format-equivalent imports produce different hashes. Mitigation: a single `parseDate(row): ISODate` with per-bank format hints; normalization happens before hash input.
- **W-1 silent scope creep**: rolling the interface amendment into FR-1 design could grow the change beyond "ingestion + dedup." Mitigation: bound the amendment to `AuditSplitProps` only; new props are required for the spec §3 micro-metadata to render meaningfully.
- **Two ingest paths = two test surfaces**: filesystem vs drag-and-drop can drift if they don't share the engine. Mitigation: both Server Actions return to the same `ingestTransactions(transactions: Transaction[])`; tests assert identical output for identical input.
- **JSON store schema versioning**: FR-2 will add classification fields; the store has no migration path. Mitigation: declare `schemaVersion: 1` in FR-1 so FR-2 can branch on it.
- **Production greenfield bootstrap**: no `package.json`, no `next.config.*`, no test runner config exists. FR-1 must create all of this. Risk of getting scaffolding wrong blocks later tasks. Mitigation: tasks.md groups scaffolding into a single "infra" work-unit before any engine code.
- **`/data/raw` path portability**: hard-coded path breaks on machines where the user parks the folder differently. Mitigation: env var `BUNKER_DATA_DIR` with `/data/raw` as the default; documented in `README.md`.

---

## Open Questions for Proposal Phase

These must be resolved before `sdd-propose` writes the FR-1 proposal — each has real tradeoffs and the orchestrator should ask the user once per question:

1. **Ingest coverage**: filesystem only, drag-and-drop only, or both? Recommendation: both (shared engine), per spec wording.
2. **`cleanDescription` contract**: what normalization rules apply (case folding, whitespace collapse, currency-symbol strip, merchant-code extraction)? Pin a written contract before the test block; otherwise the hash is undefined.
3. **Date normalization ordering**: normalize date format BEFORE hashing (so re-imports with different format files dedup) or AFTER (format-stable hash, but re-imports don't dedup)? Recommendation: BEFORE.
4. **Store schema versioning**: declare `schemaVersion: 1` in FR-1 (with no migrations yet) to set up FR-2 cleanly, or defer entirely until FR-2 needs it?
5. **W-1 reconciliation path**: revert `AuditSplit` to direct label import (option a), formally amend the frozen interface (option b), or bundle the amendment with FR-1's inevitable new metadata props (recommended)?

---

## Ready for Proposal

**Yes.** Move to `sdd-propose`. The proposal should:

1. Declare environment `[production]` and reference the FR-0 frozen contracts in `openspec/changes/archive/2026-06-22-fr0-wireframing-sandbox/design.md` (§80-99) plus the W-1 status in `archive-report.md` (§125-134).
2. State that **strict TDD activates here** — the three spec §4 test blocks become gating scenarios.
3. Propose **CSV ingest = both paths** (filesystem + drag-and-drop) sharing one engine.
4. Propose **engine location = Server Actions** (option A).
5. Propose **store = local JSON file** at `${BUNKER_DATA_DIR:-/data}/state/transactions.json` with `schemaVersion: 1`.
6. Resolve W-1 by **amending the frozen `AuditSplitProps`** to include the DI labels AND the new real-data metadata props (`sourceFiles`, `dateRange`, `transactionCount`) — single SDD decision, not a special-case revert.
7. Include a rollback plan (delete `/data/state/transactions.json` and the production scaffold; FR-0 sandbox unaffected).
8. Flag that the production repo bootstrap is part of FR-1's infra work-unit (Next.js scaffold, Vitest config, Tailwind, ESLint, Prettier, `tsconfig`).