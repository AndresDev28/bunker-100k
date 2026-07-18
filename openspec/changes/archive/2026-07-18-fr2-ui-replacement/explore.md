# Exploration: FR-2 UI Replacement (consume real store data)

> Environment: **[production]** — Next.js (App Router) + TypeScript + Tailwind + Vitest.
> Scope: transition the BKR-100 UI off `sandbox/src/fixtures.ts` hardcoded fixtures onto the real persisted JSON store (`${BUNKER_DATA_DIR:-/data}/state/transactions.json`) via the FR-1 frozen contract at `src/sandbox-bridge/frozenContracts.ts`.
> Artifact store: hybrid (this file + Engram `sdd/fr2-ui-replacement/explore`).
> Strict TDD: **continues active** — spec §4 gate blocks already pass from FR-1; FR-2 may add UI/aggregate test blocks.
> Sandbox posture: **READ-ONLY reference** — `sandbox/` is gitignored/untracked (see `.gitignore` L33, FR-1 archive `§Post-Merge State`). Do NOT mutate or re-track.

---

## Context Snapshot

FR-1 closed greenfiled: idempotent CSV ingestion + SHA-256 dedup + per-owner JSON store are live on `main` (74/74 tests, archived 2026-07-17). The production-canonical typed contract was frozen at `src/sandbox-bridge/frozenContracts.ts` (W-9), closing W-1 by supersession. The production route is still a placeholder (`app/page.tsx` returns "FR-1 placeholder (UI replacement in FR-2)"). This change replaces that placeholder with real components fed by real persisted data, consuming the frozen contract FR-1 froze.

A naming tension the proposal must resolve up front: **spec.md FR-2** is titled "Two-Tier Cognitive Classification Matrix" (keyword/regex subcategory matching, §2), while this change's scope (per orchestrator) is "UI replacement onto the real store". The FR-1 archive `§Deferred Items` defers *both* UI replacement AND regex/keyword heuristics to "FR-2". The two are coupled (see Risks R1) but not identical; the proposal must state explicitly whether keyword classification is in-scope for THIS change or split into a separate FR.

---

## Current State

### Sandbox UI surface (blueprint only — gitignored, read-only)

`sandbox/src/App.tsx` destructures `fixtures` (`{ summary, needs_breakdown, wants_breakdown }`) and composes four components. All UI strings live in `sandbox/src/labels.ts` (zero inline JSX literals — a convention to carry forward).

| Sandbox component | Props it consumes (FR-0 shape) |
|---|---|
| `BunkerHeader` | `{ title: string; status: string }` — hardcoded `status="Wireframe — FR-0"` in App |
| `BunkerHero` | `{ bunkerTarget, currentCash, progressPercent, monthsRemaining, survivalMonthlyCost }` (5 numbers) — renders `microProgress`, `microSurvivalCost` |
| `MacroGrid` | `{ cards: readonly { label; value: number\|string; trend }[] }` — exactly 3 cards (Income / Wants / Save Rate) built in App from `summary` |
| `AuditSplit` | `{ needs, wants, optimizationPotential, needsLabels, wantsLabels }` — 2-column `<table>`, renders `optimizationFooter` |

Sandbox domain model (`sandbox/src/fixtures.ts`):
- `CategoryLine<K> = { subcategory: K; amount: Eur }` — **no `budget`, no `percentage`**.
- `BunkerSummary` has 8 fields: `bunkerTarget, currentCash, progressPercent, monthsRemaining, survivalMonthlyCost, incomeMedios, wantsTotal, saveRate`.
- Subcategory vocab: Needs = `housing|groceries|utilities|liabilities`; Wants = `restoration|subscriptions|variables` (matches spec §2 verbatim).
- Static fixture: needs=1400, wants=600, Bt=8400, currentCash=2520, progress 30%, 14 months.

### The frozen contract (`src/sandbox-bridge/frozenContracts.ts`) — delta vs sandbox

FR-1 deliberately left three component-prop interfaces as **empty stubs** (`Record<string, never>`) with the comment *"BunkerFixtures stub — full component props deferred to FR-2 UI work"*. So FR-2 neither inherits nor frees these — it must **(re)freeze** their shapes. The sandbox shapes (which matched FR-0 frozen props 1:1 per FR-1 explore §"Component props") are the natural source.

| Symbol | Sandbox / FR-0 shape | Frozen (FR-1) shape | Delta FR-2 must handle |
|---|---|---|---|
| `CategoryLine<K>` | `{ subcategory; amount }` | `{ subcategory; amount; budget; percentage }` | **+`budget` +`percentage`** (bar widths / target comparison) |
| `BunkerSummary` | 8 fields (incl. `progressPercent, incomeMedios, wantsTotal, saveRate`) | 4 fields: `{ survivalMonthlyCost, bunkerTarget, currentCash, monthsRemaining }` | **Drops** `progressPercent, incomeMedios, wantsTotal, saveRate` — these must be DERIVED in the aggregate layer or the props refrozen |
| `BunkerHeaderProps` | `{ title; status }` | `Record<string, never>` (empty stub) | **FR-2 must define** — either re-freeze sandbox shape or design new |
| `BunkerHeroProps` | 5 number fields | `Record<string, never>` (empty stub) | **FR-2 must define** |
| `MacroGridProps` | `{ cards }` | `Record<string, never>` (empty stub) | **FR-2 must define** |
| `AuditSplitProps` | `{ needs, wants, optimizationPotential, needsLabels, wantsLabels }` | `{ +needs, +wants, +optimizationPotential, +needsLabels, +wantsLabels, +sourceFiles, +dateRange, +transactionCount, +ownerId }` | **+4 metadata props** (sourceFiles, dateRange, transactionCount, ownerId) already frozen — UI must render them |
| `NeedsSubcategory` | `housing\|groceries\|utilities\|liabilities` (4) | `food\|transport\|housing\|utilities\|health\|education\|subscriptions\|other_needs` (8) | **VOCAB DIVERGES** from spec §2 AND sandbox — see R2 |
| `WantsSubcategory` | `restoration\|subscriptions\|variables` (3) | `restoration\|entertainment\|shopping\|subscriptions\|travel\|other_wants` (6) | **VOCAB DIVERGES** — see R2 |

`BunkerFixtures` frozen bundles `{ header, hero, macroGrid, auditSplit, summary }`.

### Real data access path

- **Engine primitive EXISTS**: `src/lib/engine/store.ts` `readStore(dataDir, ownerId): Promise<Transaction[]>` (REQ-STORE-5). Returns `[]` for missing owner, never throws. `dataDir` is a parameter — the engine is dir-agnostic.
- **Write path EXISTS**: `src/app/actions/ingestFromFolder.ts` (`'use server'`) resolves `dataDir = process.env.BUNKER_DATA_DIR ?? '/data'` and `ownerId ?? 'self'`, then calls `readStore`/`upsertTransactions`.
- **READ path for the UI: GAP.** Only one `'use server'` action exists (ingestFromFolder — a writer). There is NO read Server Action and NO Server Component that calls `readStore`. The `BUNKER_DATA_DIR` env resolution is duplicated only inside the write action. FR-2 must add one of: (a) a read Server Action `loadTransactions(ownerId?)`, (b) direct async `readStore` call inside a Server Component `app/page.tsx`, or (c) a shared `resolveDataDir()` helper used by both read and write to avoid drift.
- **Aggregation layer: GAP.** Nothing transforms `Transaction[]` → `BunkerFixtures` / `AuditSplitProps` (CategoryLine[] with budget+percentage, sourceFiles, dateRange, transactionCount). The store holds raw `Transaction[]`; the frozen contract holds *aggregated* component props. FR-2 must build this transform (an engine/view-model module, pure, unit-testable).

### Type contracts (production, `src/lib/types/*`)

`Transaction` (`transaction.ts`):
```ts
{ id, date: ISODate, description, cleanedDescription, amount,   // signed: -outflow/+inflow
  category: { tier: 'income'|'needs'|'wants'; subcategory: string },  // FR-1 STUB body
  ownerId, firstSeenAt: ISODateTime, sourceFile }
```
`PersistedTransactions` (`store.ts`): `{ schemaVersion: 1; owners: Record<ownerId, Transaction[]> }`.
`IngestResult` (`ingest.ts`): `{ ingested, deduped, skipped, logPath, transactionCount }`.
`CategoryRef` (`category.ts`): `{ tier; subcategory }` — comment: *"FR-1 stub uses sign-based routing; FR-2 replaces the body with keyword matching at the same boundary."*

### Routing / tooling facts

- Next.js App Router appDir = root `app/` (`app/page.tsx`, `app/layout.tsx`). Server Actions live under `src/app/actions/`. tsconfig `paths: { "@/*": ["./src/*"] }`; `tsconfig.exclude` = `["node_modules","sandbox"]` (sandbox is type-excluded).
- Tailwind scans `./app/**` + `./src/**` (`tailwind.config.ts` L4); `darkMode: 'class'`. Spec §3 mandates a dark-minimalist style — **Tailwind is production-only (sandbox had zero styling by FR-0 constraint)**, so the FR-2 UI is the first Tailwind-styled surface and SHOULD ship real §3 styling.
- Validation gates: `npm run test:run` (`vitest run`), `npm run typecheck` (`tsc --noEmit`), `npm run lint` (`eslint .`), `npm run format:check` (`prettier --check .`), `npm run build`.

### Sandbox preservation lesson (FR-1 incident)

FR-1 archive Engram obs #1207 ("PR-7 sandbox destruction incident + recovery") + archive-report `§Post-Merge State`: re-tracking/mutating `sandbox/` previously destroyed the FR-0 blueprint; recovery came from git history. Current state: `sandbox/` is **gitignored + untracked + type-excluded**, preserved as inert reference. **Recommendation: FR-2 must NOT touch `sandbox/` at all** — read it only as a visual reference; produce the UI in `app/` + `src/components/`.

---

## Affected Areas

- `app/page.tsx` — placeholder to be replaced by the real server component (the route entry; calls read + aggregate + renders).
- `app/layout.tsx` — likely needs Tailwind globals import (`globals.css`) + `dark` class on `<html>` for §3 dark theme (currently bare `<body>`).
- `src/sandbox-bridge/frozenContracts.ts` — **MUST be amended** to re-freeze `BunkerHeaderProps`/`BunkerHeroProps`/`MacroGridProps` (currently empty stubs) and possibly reconcile the subcategory vocabulary divergence (R2). This re-freeze is itself an SDD decision for the proposal/design.
- `src/lib/engine/store.ts` — read primitive ready; no change needed for reads, but the `BUNKER_DATA_DIR` resolution should be factored into a shared helper to avoid read/write drift.
- `src/app/actions/ingestFromFolder.ts` — candidate to share a `resolveDataDir()`/`resolveOwnerId()` helper with the new read path.
- **NEW** `src/app/actions/loadTransactions.ts` (or read inline in Server Component) — read entry for the UI.
- **NEW** `src/lib/engine/` aggregation/view-model module — `Transaction[] → BunkerFixtures` (pure, testable). Whether it lives in `engine/` (pure aggregate) or a `view-models/` layer is a design decision.
- **NEW** `app/components/` or `src/components/` — production components (`BunkerHeader`, `BunkerHero`, `MacroGrid`, `AuditSplit`) consuming the frozen contract with Tailwind. Placement is a design decision (App-Router colocated vs `@/` aliased lib).
- `src/lib/labels.ts` (NEW, production) — port `sandbox/src/labels.ts` constants (`HERO_TITLE`, `NEEDS_LABELS`, `WANTS_LABELS`, micro-metadata templates) into production view constants.
- `src/lib/types/category.ts` / `classify.ts` — only touched if keyword classification is pulled into this change (R1/R2). Otherwise untouched.
- Tests: NEW `*.test.ts(x)` for the aggregation transform and (if added) the read action; spec §4 gates remain green.

---

## Approaches

### A. Server-Component reads the store directly (no read Server Action)
`app/page.tsx` is an `async` Server Component: resolves `dataDir`/`ownerId` (shared helper), calls `readStore(...)` directly, pipes through a pure aggregate module, passes `BunkerFixtures` to presentational components.

- Pros: simplest; zero HTTP/serialization boundary; one fewer `'use server'` file; Server Components are the idiomatic App-Router read path; aggregate layer stays pure & unit-testable.
- Cons: no client-triggered refresh without a separate action; if a future "Re-ingest" button lives client-side it will still need a write action anyway.
- Effort: **Low–Medium**.

### B. Read Server Action + Server Component that calls it
Add `loadTransactions(input?)` (`'use server'`) mirroring `ingestFromFolder`'s parameter shape; `app/page.tsx` `await`s it. Symmetric to the write path.

- Pros: read/write action symmetry; reusable from client components (e.g. a refresh button via `useTransition`); explicit, named, testable boundary; matches the FR-1 "everything is a Server Action" posture.
- Cons: one extra `'use server'` file; the action is a thin wrapper over `readStore`. Marginal complexity for marginal benefit today.
- Effort: **Low–Medium**.

### C. Route Handler (`app/api/transactions/route.ts`) GET
- Pros: RESTful, language-agnostic.
- Cons: breaks the App-Router Server-Action idiom established in FR-1; HTTP/serialization boundary for no gain in a local-first app; loses shared TS types at the call site. Rejected for the same reasons FR-1 rejected it (`explore.md` §"Engine Location Options").
- Effort: **Medium**, **not recommended**.

### Component placement sub-decision (orthogonal to A/B)

- **C1. `app/components/` colocated** with the App Router — importable by `app/page.tsx` via relative paths; Tailwind scans `./app/**`; idiomatic App-Router layout.
- **C2. `src/components/` aliased** via `@/components/*` — keeps all non-route source in `src/`; symmetric with `src/lib/`; Tailwind still scans `./src/**`.
- Recommendation: **C2** — keeps source cohesion under `src/` and the `@/*` alias, matches where `lib/`/`sandbox-bridge` already live, and keeps `app/` thin (route composition only).

### Aggregate boundary sub-decision

- **G1. Pure module under `src/lib/engine/`** (e.g. `buildBunkerViewModel(transactions): BunkerFixtures`) — sits with the engine, fully unit-testable, no React.
- **G2. Co-located view-model hook in a Server Component** — less testable, discouraged.
- Recommendation: **G1** — the transform is pure data math; it belongs with the engine and must carry its own TDD block.

### Frozen-contract amendment sub-decision (mandatory)

FR-2 must re-freeze the three empty stub props. Options:
- **F1. Re-freeze from FR-0 sandbox shapes** (Header `{title,status}`, Hero 5 numbers, MacroGrid `{cards}`) — restores the FR-0-verified contract; minimal surprise.
- **F2. Design new prop shapes** informed by §3 (e.g. Hero drops `progressPercent` since frozen `BunkerSummary` already removed it; compute instead).
- Recommendation: **F1 as the base, then trim** to align with the frozen 4-field `BunkerSummary` — e.g. Hero keeps `bunkerTarget, currentCash, monthsRemaining, survivalMonthlyCost` and derives `progressPercent` internally. This keeps the contract honest with what the frozen `BunkerSummary` exposes.

---

## Recommendation

**A + C2 + G1 + F1-trimmed**, with FR-2 scope explicitly bounded.

1. **Read path = A (Server Component calls `readStore` directly)**, factoring `BUNKER_DATA_DIR`/`ownerId` resolution into a shared `src/lib/engine/env.ts` helper used by both `ingestFromFolder` and `app/page.tsx` to kill read/write env drift. Escalate to B (read Server Action) only if a client-triggered refresh is added in-scope.
2. **Component placement = C2** (`src/components/*`, `@/` aliased); keep `app/page.tsx` a thin async Server Component that reads → aggregates → renders.
3. **Aggregate layer = G1** (`src/lib/engine/buildBunkerViewModel.ts`, pure, with its own Vitest block).
4. **Frozen contract = F1-trimmed**: re-freeze `BunkerHeaderProps`/`BunkerHeroProps`/`MacroGridProps` from the FR-0 sandbox shapes, trimmed to align with the frozen 4-field `BunkerSummary`. Document the re-freeze as an SDD decision in proposal/design.
5. **Sandbox untouched**: read-only visual reference; never mutate, never re-track. Production UI is built fresh in `src/components/` + `app/page.tsx`.
6. **Ship real Tailwind §3 styling** on first load — this is the first styled surface; bare HTML is not acceptable for FR-2 (FR-0's zero-styling constraint was sandbox-only).
7. **Scope boundary**: the proposal must explicitly decide keyword classification (spec §2 "FR-2") is IN or OUT. See R1 — recommended to keep THIS change pure-UI (render sign-stub categorization from the store) and split keyword classification into a sibling change, because the frozen subcategory vocabulary (R2) diverges from both spec §2 and sandbox and must itself be reconciled first.

---

## Risks

- **R1 — Classification-vs-UI scope ambiguity (HIGH).** spec.md labels §2 as "FR-2: Two-Tier Cognitive Classification Matrix". This change is scoped to UI replacement onto real data. The store's `Transaction.category` is still the FR-1 **sign-based stub** (`classify.ts` returns only `{tier:'income',subcategory:'salary'}` or `{tier:'wants',subcategory:'variables'}`). Real persisted data therefore cannot populate a meaningful *subcategory* breakdown (`housing`, `groceries`, …) today. If FR-2 = UI-only, the AuditSplit subcategory lists will be degenerate (one `salary` + one `variables` line). The proposal MUST resolve: (a) ship UI over sign-stub data now and defer keyword classification, or (b) pull keyword classification into this change (scope expands materially). Recommend (a).

- **R2 — Subcategory vocabulary triple-divergence (HIGH).** Three vocabularies exist: spec §2 (`housing|groceries|utilities|liabilities` / `restoration|subscriptions|variables`), sandbox (same as spec §2), and frozen `frozenContracts.ts` (`food|transport|housing|utilities|health|education|subscriptions|other_needs` / `restoration|entertainment|shopping|subscriptions|travel|other_wants`). The frozen contract is neither spec-aligned nor sandbox-aligned, and labels (`NEEDS_LABELS`/`WANTS_LABELS`) only exist for the sandbox/spec vocab. FR-2 cannot freeze `needsLabels`/`wantsLabels` maps until the canonical subcategory vocab is decided. This is a blocking design decision for proposal+design.

- **R3 — Missing read API / env-drift (MEDIUM).** No read entry exists; `BUNKER_DATA_DIR` resolution is duplicated only in the writer. Without a shared helper, the read path could resolve a different `dataDir` than the writer and silently render an empty store. Mitigation: shared `resolveDataDir()` helper.

- **R4 — Aggregation math not yet defined (MEDIUM).** `CategoryLine.budget`/`percentage`, `dateRange`, `transactionCount`, `sourceFiles`, `monthsRemaining` (frozen), and the dropped `progressPercent`/`incomeMedios`/`wantsTotal`/`saveRate` all need derivation rules. Spec §3 FR-3 (dynamic `Δ_M`, monthly averages, `B_t = C_s × 6`) is explicitly **deferred to FR-3** per FR-1 archive — `computeBunkerTarget` is still a stub (`survivalMonthlyCost × 6`). FR-2 must choose placeholder derivations that FR-3 will later replace, clearly labeled as non-final. Risk of accidental "real math" leaking into FR-2.

- **R5 — Sandbox destruction recurrence (MEDIUM, process).** FR-1 already had a PR-7 incident destroying `sandbox/`. FR-2 touches the boundary (`frozenContracts.ts`) and the migration narrative — high temptation to "also clean up" sandbox. Mitigation: hard rule "no `sandbox/` edits in any FR-2 PR"; enforce in review/tasks.

- **R6 — Tailwind/dark-theme bootstrap (LOW–MEDIUM).** No `globals.css`/`dark` class is wired (`app/layout.tsx` is bare). Spec §3 dark-minimalist requires it. Small but easy to forget; gates via `npm run build`.

- **R7 — `ownerId` selection / auth (LOW for this change).** Store is per-owner; default `'self'`. FR-2 needs an ownerId source for the read. With no auth yet (local-first, single user assumed A1), hardcoding `'self'` (matching `ingestFromFolder` default) is acceptable for FR-2; multi-owner selection is a future FR.

---

## Open Questions for Proposal Phase

Each has real tradeoffs; the orchestrator should ask the user once per question:

1. **Scope**: Is THIS change pure-UI-replacement (render the sign-stub categorization already in the store), or does it also land spec §2 keyword classification? (Recommend pure-UI; split classification into a sibling change.)
2. **Subcategory vocabulary (R2)**: adopt spec §2 / sandbox vocab, keep the frozen 8/6-vocab, or reconcile to a new canonical? This freezes `NEEDS_LABELS`/`WANTS_LABELS`. (Needs a written decision before design.)
3. **Re-freeze shape for Header/Hero/MacroGrid**: re-freeze from FR-0 sandbox shapes (F1) or design new (F2)? (Recommend F1-trimmed to the 4-field frozen `BunkerSummary`.)
4. **Read path**: Server Component direct read (A) vs read Server Action (B)? (Recommend A + shared env helper; escalate to B only if a client refresh button is in-scope.)
5. **Aggregate math placeholders**: accept FR-2 placeholder derivations for `budget`/`percentage`/`monthsRemaining`/`progressPercent`/`saveRate` that FR-3 replaces, or block FR-2 until FR-3 math lands? (Recommend accept placeholders, clearly labeled.)
6. **`ownerId` source**: hardcode `'self'` for FR-2 (matches ingest default, assumption A1)? (Recommend yes; defer selection UI.)
7. **Sandbox disposition**: keep `sandbox/` as read-only untracked reference (current) or plan deletion post-migration? (Recommend keep — inert, gitignored, free.)
8. **Dark-theme/Tailwind bootstrap**: wire `globals.css` + `dark` class on `<html>` as part of FR-2 (recommended) so §3 styling ships on first load?

---

## Ready for Proposal

**Yes.** Move to `sdd-propose`. The proposal should:

1. Declare environment `[production]`, reference the FR-1 frozen contract (`src/sandbox-bridge/frozenContracts.ts`) and the FR-1 baseline specs (`csv-ingestion`, `transaction-dedup`, `transaction-store`).
2. Resolve R1+R2 explicitly: state whether keyword classification is in-scope, and freeze the canonical subcategory vocabulary + label maps.
3. Re-freeze `BunkerHeaderProps`/`BunkerHeroProps`/`MacroGridProps` (currently empty stubs) as an SDD decision — recommend F1-trimmed.
4. Propose read path A (Server Component direct read) + shared `resolveDataDir()`/`resolveOwnerId()` helper; mention B as the escalation path if client refresh lands.
5. Propose the pure aggregate module (`buildBunkerViewModel`) with its own TDD block; clearly mark placeholder aggregations that FR-3 will replace.
6. Add the Tailwind/dark-theme bootstrap (`globals.css`, `dark` class) so §3 styling ships.
7. Restate the hard sandbox-preservation rule (no `sandbox/` edits) as a task-level guard.
8. Provide a rollback plan (delete `app/components`/`src/components` additions + aggregate module + read path; restore `app/page.tsx` placeholder; `frozenContracts.ts` re-freeze is the one mutation to revert).
9. Flag the 400-line review budget: production UI + 4 components + labels + aggregate + read path + contract re-freeze + tests plausibly approaches the budget → **chained PRs likely recommended** (tasks forecast `Decision needed before apply: Yes`, `400-line budget risk: Medium–High`).