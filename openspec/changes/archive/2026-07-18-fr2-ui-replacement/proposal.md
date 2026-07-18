# Proposal: FR-2 UI Replacement (consume real store data)

## Intent

Replace the FR-1 `app/page.tsx` placeholder with a functional, **un-styled** production UI that renders real persisted transactions from `readStore`. FR-1 closed with idempotent ingestion, a frozen contract at `src/sandbox-bridge/frozenContracts.ts`, three empty component-prop stubs, and a 4-field `BunkerSummary`. FR-2 closes those stubs, ships a thin Server-Component read path, a pure aggregate layer, and four components — without Tailwind/dark styling. **Environment: `[production]`. strict_tdd continues.**

## Scope

### In Scope
- **Re-freeze** `BunkerHeaderProps` / `BunkerHeroProps` / `MacroGridProps` in `src/sandbox-bridge/frozenContracts.ts` (F1-trimmed — Hero derives `progressPercent` internally; `incomeMedios`/`wantsTotal`/`saveRate` move to the aggregate layer as placeholders).
- **Re-freeze** `NeedsSubcategory` / `WantsSubcategory` unions to the spec §2 vocab: Needs `housing|groceries|utilities|liabilities` (4); Wants `restoration|subscriptions|variables` (3). Corrects the FR-1 drift where frozen was 8/6.
- **Shared env helper** `src/lib/engine/env.ts` exporting `resolveDataDir()` / `resolveOwnerId()`; both `ingestFromFolder` and the new read path consume it.
- **Read Server Action** `src/app/actions/loadTransactions.ts` (`'use server'`) mirroring `ingestFromFolder`'s input shape, calling `readStore` via the shared helper. `ownerId` hardcoded to `'self'`.
- **Pure aggregate** `src/lib/engine/buildBunkerViewModel.ts` — `Transaction[] → BunkerFixtures`. Own Vitest block. Placeholder derivations marked `// FR-3 REPLACES — non-final`.
- **Labels port** `src/lib/labels.ts` — `NEEDS_LABELS`, `WANTS_LABELS`, `HERO_TITLE`, micro-metadata templates (from `sandbox/src/labels.ts`).
- **Components** `src/components/{BunkerHeader,BunkerHero,MacroGrid,AuditSplit}.tsx` — bare functional markup, no Tailwind/dark wiring, matching the sandbox layout/contract.
- **Route** `app/page.tsx` becomes a thin async Server Component: `loadTransactions` → `buildBunkerViewModel` → render.

### Out of Scope
- Keyword/regex subcategory classification (spec §2 "FR-2: Two-Tier Cognitive Classification Matrix") → sibling change `fr2b-classification` (its own SDD cycle). AuditSplit will show a degenerate single-`salary` + single-`variables` breakdown **by design**.
- Real `B_t = C_s × 6` math, dynamic `Δ_M`, monthly averages → FR-3.
- Tailwind globals, dark-minimalist theme, `globals.css` / `dark` class on `<html>` → separate polish FR.
- Multi-owner / auth — `ownerId` hardcoded to `'self'`.

## Locked Assumptions (A1–A7)

| # | Decision | Rationale |
|---|----------|-----------|
| A1 | Pure-UI replacement; classification → sibling change | One thing per change; FR-1 spec §4 gates stay green; sibling change expands vocabulary later via documented supersession |
| A2 | Freeze spec §2 vocab (4/3); re-freeze unions + port labels | Reconciles drift between frozen 8/6, sandbox, and spec §2; locks canonical labels |
| A3 | Read Server Action under `src/app/actions/` + shared `resolveDataDir`/`resolveOwnerId` helper | Read/write symmetry with FR-1; kills env-drift (R3); unblocks future client refresh |
| A4 | `sandbox/` 100% untouched; `ownerId` hardcoded `'self'` | Anti FR-1 PR-7 lesson (Engram obs #1207); single-user assumption A1 |
| A5 | Functional un-styled UI only; Tailwind/dark deferred | §3 dark-minimalist styling ships in a later polish FR; first surface ships bare-but-correct |
| A6 | Pure `buildBunkerViewModel` under `src/lib/engine/` (G1); placeholder derivations for `budget` / `percentage` / `monthsRemaining` / `progressPercent` / `saveRate` marked `// FR-3 REPLACES — non-final` | FR-3 owns dynamic math; no accidental "real" math in FR-2 |
| A7 | F1-trimmed re-freeze: Hero props `{bunkerTarget, currentCash, monthsRemaining, survivalMonthlyCost}`; `progressPercent` derived inside Hero; `incomeMedios`/`wantsTotal`/`saveRate` move to aggregate placeholders | Honest with frozen 4-field `BunkerSummary`; sandbox-only fields drop from props |

## Approach

`loadTransactions(input?)` → `readStore(dataDir, ownerId)` (via `resolveDataDir`/`resolveOwnerId`) → `buildBunkerViewModel(transactions): BunkerFixtures` → render `<BunkerHeader>` / `<BunkerHero>` / `<MacroGrid>` / `<AuditSplit>`. Aggregate placeholders labeled with `// FR-3 REPLACES — non-final`. `app/` stays thin (route + read). `src/components/` carries the components under the `@/` alias (C2).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/sandbox-bridge/frozenContracts.ts` | Modified | Re-freeze 3 stub props + 2 subcategory unions (A2, A7) |
| `src/app/actions/ingestFromFolder.ts` | Modified (internal) | Consume shared `resolveDataDir` / `resolveOwnerId`; no behavior delta |
| `app/page.tsx` | Modified | Placeholder → async Server Component |
| `app/layout.tsx` | **Untouched** (no styling this change) |
| `src/app/actions/loadTransactions.ts` | New | Read Server Action |
| `src/lib/engine/env.ts` | New | Shared `resolveDataDir` / `resolveOwnerId` |
| `src/lib/engine/buildBunkerViewModel.ts` | New | Pure aggregate + Vitest block |
| `src/lib/labels.ts` | New | Port of `sandbox/src/labels.ts` constants |
| `src/components/{BunkerHeader,BunkerHero,MacroGrid,AuditSplit}.tsx` | New | Un-styled functional components |
| `src/components/*.test.tsx` + `src/lib/engine/*.test.ts` | New | Aggregate + env + smoke component tests |
| `sandbox/` | **Hard rule: 0 edits** (anti FR-1 PR-7) |

## Risks (residual after A1–A7)

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Aggregate placeholders leak as "real math" | Med | `// FR-3 REPLACES — non-final` markers; aggregate tests assert placeholder values, not real formulas |
| `frozenContracts.ts` re-freeze breaks an unexpected consumer | Low | Only `src/lib/types/category.ts` (stub) and the sibling classification change touch the unions; design phase verifies call sites |
| 400-line review budget exceeded | **High** | Tasks phase: `Decision needed before apply: Yes`, `Chained PRs recommended: Yes`, `400-line budget risk: High` |
| AuditSplit degenerate `salary` + `variables` reads as broken to a reviewer | Low | PR description + proposal cite A1 explicitly; sibling change is the resolution |
| Sandbox re-tracking tempted in a sub-PR | Med | Hard rule restated as a task-level guard; tasks plan forbids `sandbox/` paths |

## Rollback Plan

Revert the `frozenContracts.ts` re-freeze (the one mutation to the existing contract). Delete new files: `src/components/*`, `src/lib/labels.ts`, `src/lib/engine/buildBunkerViewModel.ts`, `src/app/actions/loadTransactions.ts`, `src/lib/engine/env.ts`, and the new `*.test.ts` blocks. Restore `app/page.tsx` to the FR-1 placeholder. Revert `src/app/actions/ingestFromFolder.ts` to inline `process.env.BUNKER_DATA_DIR ?? '/data'` and `ownerId ?? 'self'`. No data migration needed — JSON store and frozen `AuditSplit` metadata fields untouched. Sandbox untouched throughout (no rollback needed for `sandbox/`).

## Success Criteria

- [ ] `vitest run`, `tsc --noEmit`, `eslint .`, `prettier --check .`, `npm run build` all pass.
- [ ] `app/page.tsx` renders `<BunkerHeader>` / `<BunkerHero>` / `<MacroGrid>` / `<AuditSplit>` against real persisted store data (default `dataDir`, `ownerId='self'`).
- [ ] `frozenContracts.ts` re-freezes the 3 stub props + 2 subcategory unions per A2/A7; frozen `AuditSplitProps` metadata fields (`sourceFiles`, `dateRange`, `transactionCount`, `ownerId`) untouched.
- [ ] `loadTransactions` and `ingestFromFolder` share `resolveDataDir` / `resolveOwnerId` — no `process.env.BUNKER_DATA_DIR` literal outside the helper.
- [ ] `buildBunkerViewModel` is a pure function with its own Vitest block; every placeholder derivation carries `// FR-3 REPLACES — non-final`.
- [ ] `sandbox/` working tree is byte-identical to `main` (no edits, no re-tracking) — verifiable via `git status`.
- [ ] Spec §4 gates remain green; new test blocks follow the same Given/When/Then pattern as FR-1.
- [ ] FR-1 baseline specs (`csv-ingestion`, `transaction-dedup`, `transaction-store`) remain unchanged at the spec level — only internal refactor of `ingestFromFolder` and a thin `readStore` wrapper are added.

## Capabilities

### New Capabilities
- **`bunker-ui`**: Production UI surface — `BunkerHeader` / `BunkerHero` / `MacroGrid` / `AuditSplit` consuming the frozen `BunkerFixtures` contract, with labels from `src/lib/labels.ts`. Un-styled in this change.
- **`bunker-aggregate`**: Pure `Transaction[] → BunkerFixtures` transform (`buildBunkerViewModel`) under `src/lib/engine/`, with its own Vitest block; placeholder derivations marked `// FR-3 REPLACES — non-final`.
- **`bunker-read-action`**: Read Server Action `loadTransactions` under `src/app/actions/` plus the shared `src/lib/engine/env.ts` (`resolveDataDir` / `resolveOwnerId`) helper, eliminating read/write env-drift.

### Modified Capabilities
None. `csv-ingestion`, `transaction-dedup`, `transaction-store` assert behavior, not internal structure; the `ingestFromFolder` refactor to consume the shared helper is internal-only, and `readStore` already exists. The `frozenContracts.ts` re-freeze is a contract supersession captured inside `bunker-ui` (no delta spec against an existing capability).