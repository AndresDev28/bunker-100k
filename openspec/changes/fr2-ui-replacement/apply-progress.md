# Apply Progress: FR-2 UI Replacement

## Work Unit W-A: Re-freeze foot-gun pin (COMPLETED)

**Branch**: `feat/fr2-w-a-refreeze-pin`
**Commit**: `a5d94c4b2db4c8adde37a1f12ef41c937bbe4224`
**Date**: 2026-07-17

### Tasks Completed

- [x] A1 CREATE `src/components/__tests__/components.test.ts` with RED contract assertions
- [x] A2 MODIFY `src/sandbox-bridge/frozenContracts.ts` — re-freeze 2 unions + 3 prop stubs
- [x] A3 GREEN — all gates pass

### Gate Results

- **vitest run**: 79/79 tests pass (including 5 new contract tests)
- **tsc --noEmit**: PASS (no errors)
- **eslint .**: PASS (no errors)
- **prettier --check .**: PASS (source files formatted; pre-existing warnings in openspec/ artifacts only)
- **git status sandbox/**: CLEAN (untouched per A4)

### Files Changed

| File                                          | Action   | Description                                                                                                                  |
| --------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/sandbox-bridge/frozenContracts.ts`       | Modified | Re-frozen `NeedsSubcategory` (4), `WantsSubcategory` (3), `BunkerHeaderProps`, `BunkerHeroProps`, `MacroGridProps` per A2/A7 |
| `src/components/__tests__/components.test.ts` | Created  | Shared contract test file (W-A creates, W-F/W-G extend)                                                                      |

### Strict TDD Evidence

| Task  | RED (test first)                                                                     | GREEN (impl passes)                          | REFACTOR                               |
| ----- | ------------------------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------- |
| A1-A3 | `tsc --noEmit` failed with 13 type errors (Record<string, never> vs expected shapes) | All 79 tests pass, tsc/eslint/prettier green | N/A — contract pin, no refactor needed |

### Work Unit Evidence

| Evidence                                          | Required value                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `npx vitest run src/components/__tests__/components.test.ts` → 5/5 pass (3ms)                         |
| Runtime harness command/scenario and exact result | N/A — contract assertion, no runtime boundary (type-level + cardinality checks)                       |
| Rollback boundary                                 | Revert `src/sandbox-bridge/frozenContracts.ts` + delete `src/components/__tests__/components.test.ts` |

### Sandbox Guard (A4)

Verified: `git status sandbox/` reports clean. No sandbox/ files touched, imported, or re-tracked.

---

## Work Unit W-B: Shared env helper + ingestFromFolder refactor (COMPLETED)

**Branch**: `feat/fr2-pr2-env-labels` (stacked off `feat/fr2-w-a-refreeze-pin`)
**Commits**:

- `da1e56b` — `refactor(engine): extract resolveDataDir/resolveOwnerId into shared env helper`
- `1ed775a` — `refactor(ingest): use shared env helper in ingestFromFolder`
  **Date**: 2026-07-17

### Tasks Completed

- [x] B1 CREATE `src/lib/engine/env.ts` exporting `resolveDataDir()` + `resolveOwnerId()`
- [x] B2 CREATE `src/lib/engine/__tests__/env.test.ts` — RED→GREEN (3 tests)
- [x] B3 MODIFY `src/app/actions/ingestFromFolder.ts` — use shared helpers; behavior identical (9/9 existing tests still green)

### Gate Results

- **vitest run**: 90/90 tests pass (79 prev + 3 env + 8 labels)
- **tsc --noEmit**: PASS
- **eslint .**: PASS
- **prettier --check .**: PASS (source files clean)
- **git status sandbox/**: CLEAN
- **grep gate**: `process.env.BUNKER_DATA_DIR` literal only in `src/lib/engine/env.ts` (production) + its test

### Files Changed

| File                                   | Action   | Description                                                                                              |
| -------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `src/lib/engine/env.ts`                | Created  | `resolveDataDir()` returns `process.env.BUNKER_DATA_DIR ?? '/data'`; `resolveOwnerId()` returns `'self'` |
| `src/lib/engine/__tests__/env.test.ts` | Created  | 3 tests: default dataDir, env override, default ownerId                                                  |
| `src/app/actions/ingestFromFolder.ts`  | Modified | Replaced inline env resolution with `resolveOwnerId()` / `resolveDataDir()`                              |

### Strict TDD Evidence

| Task  | RED (test first)                                           | GREEN (impl passes)          | TRIANGULATE                          | REFACTOR                                          |
| ----- | ---------------------------------------------------------- | ---------------------------- | ------------------------------------ | ------------------------------------------------- |
| B1-B2 | `vitest run env.test.ts` failed: module `../env` not found | 3/3 pass                     | 3 cases (default, override, ownerId) | N/A — pure helpers                                |
| B3    | Safety net: 9/9 ingest tests pass pre-refactor             | 9/9 still pass post-refactor | N/A — behavior unchanged             | Approval test: refactor preserves all 9 behaviors |

### Work Unit Evidence

| Evidence                                          | Required value                                                                                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `npx vitest run src/lib/engine/__tests__/env.test.ts src/app/actions/__tests__/ingest-from-folder.test.ts` → 3/3 + 9/9 = 12/12 pass |
| Runtime harness command/scenario and exact result | N/A — unit helper, FS only via tmpdir in store tests                                                                                |
| Rollback boundary                                 | Delete `src/lib/engine/env.ts` + `src/lib/engine/__tests__/env.test.ts`; revert `src/app/actions/ingestFromFolder.ts` to inline env |

### Sandbox Guard (A4)

Verified: `git status sandbox/` reports clean.

---

## Work Unit W-C: Port labels to production (COMPLETED)

**Branch**: `feat/fr2-pr2-env-labels`
**Commit**: `cc09af1` — `feat(labels): port NEEDS/WANTS labels to production src/lib/labels.ts`
**Date**: 2026-07-17

### Tasks Completed

- [x] C1 CREATE `src/lib/labels.ts` — ported from `sandbox/src/labels.ts`; typed against re-frozen unions

### Gate Results

- **vitest run**: 90/90 tests pass (including 8 new labels tests)
- **tsc --noEmit**: PASS
- **eslint .**: PASS
- **prettier --check .**: PASS
- **git status sandbox/**: CLEAN

### Files Changed

| File                               | Action  | Description                                                                                                                                                                                                              |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/labels.ts`                | Created | Ported `HERO_TITLE`, `NEEDS_LABELS` (4 keys), `WANTS_LABELS` (3 keys), section titles, MacroGrid labels/trends, micro-metadata templates. Typed against `NeedsSubcategory`/`WantsSubcategory` from `frozenContracts.ts`. |
| `src/lib/__tests__/labels.test.ts` | Created | 8 tests: cardinality 4/3, verbatim string match vs sandbox, micro-metadata templates                                                                                                                                     |

### Strict TDD Evidence

| Task | RED (test first)                                                 | GREEN (impl passes) | TRIANGULATE                                                   | REFACTOR             |
| ---- | ---------------------------------------------------------------- | ------------------- | ------------------------------------------------------------- | -------------------- |
| C1   | `vitest run labels.test.ts` failed: module `../labels` not found | 8/8 pass            | 8 cases (4 needs keys, 3 wants keys, hero title, 3 templates) | N/A — constants port |

### Work Unit Evidence

| Evidence                                          | Required value                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| Focused test command and exact result             | `npx vitest run src/lib/__tests__/labels.test.ts` → 8/8 pass (11ms)    |
| Runtime harness command/scenario and exact result | N/A — pure constants, asserted via cardinality + verbatim string match |
| Rollback boundary                                 | Delete `src/lib/labels.ts` + `src/lib/__tests__/labels.test.ts`        |

### Sandbox Guard (A4)

Verified: `git status sandbox/` reports clean. No sandbox/ files touched, imported, or re-tracked.

---

## Work Unit W-D: Pure aggregate buildBunkerViewModel (COMPLETED)

**Branch**: `feat/fr2-pr3-aggregate` (stacked off `feat/fr2-pr2-env-labels`)
**Commits**:

- `a0a0ecd` — `test(aggregate): add buildBunkerViewModel strict-TDD block (RED)`
- `e175aee` — `feat(aggregate): implement buildBunkerViewModel with FR-3-replaceable placeholders (GREEN)`
  **Date**: 2026-07-17

### Tasks Completed

- [x] D1 CREATE `src/lib/engine/__tests__/buildBunkerViewModel.test.ts` — 7 RED `it` blocks (#6–#11 + header)
- [x] D2 CREATE `src/lib/engine/buildBunkerViewModel.ts` — pure `Transaction[]→BunkerFixtures`
- [x] D3 GREEN — all gates pass

### Gate Results

- **vitest run**: 97/97 tests pass (90 prev + 7 new aggregate)
- **tsc --noEmit**: PASS
- **eslint .**: PASS
- **prettier --check .**: PASS (source files clean; pre-existing openspec/ warnings only)
- **git status sandbox/**: CLEAN (untouched per A4)

### Files Changed

| File                                                    | Action  | Description                                                                                                                                                          |
| ------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/engine/buildBunkerViewModel.ts`                | Created | Pure aggregate: `Transaction[]→BunkerFixtures`. Delegates `bunkerTarget` to FR-1 `computeBunkerTarget` stub. All placeholders marked `// FR-3 REPLACES — non-final`. |
| `src/lib/engine/__tests__/buildBunkerViewModel.test.ts` | Created | 7 strict-TDD tests: zero-state, 4/3 grouping, metadata, placeholder pin, delegation, purity, header.                                                                 |

### Placeholder Values Pinned (FR-3 will replace)

| Placeholder                     | Value | Comment                                                 |
| ------------------------------- | ----- | ------------------------------------------------------- |
| `currentCash`                   | `0`   | FR-3 will introduce real cash-balance tracking          |
| `monthsRemaining`               | `0`   | Because `currentCash=0`; FR-3 → `currentCash/cost`      |
| `budget` (per CategoryLine)     | `0`   | FR-3 will compute dynamic budgets from monthly averages |
| `percentage` (per CategoryLine) | `0`   | FR-3 → `amount/budget*100`                              |
| `optimizationPotential`         | `0`   | FR-3 will compute real optimization potential           |
| `incomeMedios` (MacroGrid card) | `0`   | FR-3 will compute real income aggregation               |
| `saveRate` (MacroGrid card)     | `0`   | FR-3 will compute real save rate                        |
| `header.status`                 | `''`  | Placeholder string; FR-3 may populate                   |

### Design Decisions

- **Missing-key rows**: All 4 needs keys and 3 wants keys ALWAYS appear as `CategoryLine` entries, with `amount=0` when no transactions match. This keeps AuditSplit rendering all 4+3 label columns consistently.
- **`bunkerTarget` delegation**: Imports and calls `computeBunkerTarget(survivalMonthlyCost, wantsTotal)` from FR-1 stub. Does NOT reimplement `×6` math.
- **`dateRange` sentinel**: `"1970-01-01"` for both `from` and `to` when `transactions.length === 0` (D8). Preserves non-nullable `{from: ISODate; to: ISODate}` type.
- **`ownerId`**: From `transactions[0]?.ownerId ?? 'self'` (A1).
- **Purity**: No I/O, no `Date.now()`, no `new Date()`, fully deterministic given input.

### Strict TDD Evidence

| Task  | RED (test first)                                     | GREEN (impl passes) | TRIANGULATE                                                                        | REFACTOR             |
| ----- | ---------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------- | -------------------- |
| D1-D3 | 7/7 fail: module `../buildBunkerViewModel` not found | 7/7 pass            | 7 cases (zero-state, grouping, metadata, placeholders, delegation, purity, header) | N/A — pure transform |

### Work Unit Evidence

| Evidence                                          | Required value                                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `npx vitest run src/lib/engine/__tests__/buildBunkerViewModel.test.ts` → 7/7 pass (31ms)                  |
| Runtime harness command/scenario and exact result | N/A — pure transform, no I/O, no runtime boundary                                                         |
| Rollback boundary                                 | Delete `src/lib/engine/buildBunkerViewModel.ts` + `src/lib/engine/__tests__/buildBunkerViewModel.test.ts` |

### Sandbox Guard (A4)

Verified: `git status sandbox/` reports clean. No sandbox/ files touched, imported, or re-tracked.

---

## Git Diff Summary

### PR2 branch diff vs main (includes W-A + W-B + W-C):

```
 src/app/actions/ingestFromFolder.ts         |   5 +-
 src/components/__tests__/components.test.ts | 125 ++++++++++++++++++++++++++++
 src/lib/__tests__/labels.test.ts            |  56 +++++++++++++
 src/lib/engine/__tests__/env.test.ts        |  38 +++++++++
 src/lib/engine/env.ts                       |  16 ++++
 src/lib/labels.ts                           |  55 ++++++++++++
 src/sandbox-bridge/frozenContracts.ts       |  33 ++++----
 7 files changed, 311 insertions(+), 17 deletions(-)
```

### W-B + W-C only (diff vs W-A branch tip):

```
 src/app/actions/ingestFromFolder.ts  |  5 ++--
 src/lib/__tests__/labels.test.ts     | 56 ++++++++++++++++++++++++++++++++++++
 src/lib/engine/__tests__/env.test.ts | 38 ++++++++++++++++++++++++
 src/lib/engine/env.ts                | 16 +++++++++++
 src/lib/labels.ts                    | 55 +++++++++++++++++++++++++++++++++++
 5 files changed, 168 insertions(+), 2 deletions(-)
```

### PR3 branch diff vs PR2 tip (W-D only):

```
 src/lib/engine/__tests__/buildBunkerViewModel.test.ts | 301 ++++++++++++++++++++
 src/lib/engine/buildBunkerViewModel.ts                | 217 ++++++++++++++
 2 files changed, 518 insertions(+)
```

---

## Work Unit W-E: Read Server Action loadTransactions (COMPLETED)

**Branch**: `feat/fr2-pr4-read-action-components` (stacked off `feat/fr2-pr3-aggregate`)
**Commit**: `80b6d31` — `feat(read): implement loadTransactions Server Action with strict-TDD tests`
**Date**: 2026-07-18

### Tasks Completed

- [x] E1 CREATE `src/app/actions/__tests__/load-transactions.test.ts` — 4 RED `it` blocks (#12–#14 + shared helper parity)
- [x] E2 CREATE `src/app/actions/loadTransactions.ts` — `'use server'`, delegates to `readStore` via shared env helpers
- [x] E3 GREEN — all gates pass

### Gate Results

- **vitest run**: 101/101 tests pass (97 prev + 4 new)
- **tsc --noEmit**: PASS
- **eslint .**: PASS
- **prettier --check .**: PASS
- **git status sandbox/**: CLEAN
- **grep gate**: `process.env.BUNKER_DATA_DIR` literal only in `src/lib/engine/env.ts` (production)

### Files Changed

| File                                                    | Action  | Description                                                                                                   |
| ------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `src/app/actions/loadTransactions.ts`                   | Created | `'use server'` read action; delegates to `readStore(resolveDataDir(), resolveOwnerId())` (REQ-READ-1..3)      |
| `src/app/actions/__tests__/load-transactions.test.ts`   | Created | 4 strict-TDD tests: persisted read, missing owner, shared helpers, dataDir override                           |

### Strict TDD Evidence

| Task  | RED (test first)                                              | GREEN (impl passes) | TRIANGULATE                                              | REFACTOR             |
| ----- | ------------------------------------------------------------- | ------------------- | -------------------------------------------------------- | -------------------- |
| E1-E3 | `vitest run load-transactions.test.ts` failed: module missing | 4/4 pass            | 4 cases (persisted read, missing owner, env parity, override) | N/A — thin wrapper |

### Work Unit Evidence

| Evidence                                          | Required value                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `npx vitest run src/app/actions/__tests__/load-transactions.test.ts` → 4/4 pass (16ms)                      |
| Runtime harness command/scenario and exact result | N/A — thin `'use server'` wrapper over `readStore`; FS exercised via tmpdir in tests                        |
| Rollback boundary                                 | Delete `src/app/actions/loadTransactions.ts` + `src/app/actions/__tests__/load-transactions.test.ts`        |

### Design Decision

- **Thin wrapper pattern**: `loadTransactions` is a thin `'use server'` wrapper that delegates entirely to `readStore`. No business logic reimplemented. Test imports the action directly — `'use server'` directive is a Next.js runtime annotation, not a Vitest barrier.

### Sandbox Guard (A4)

Verified: `git status sandbox/` reports clean. No sandbox/ files touched, imported, or re-tracked.

---

## Work Unit W-F: Production Components + Render Tests (COMPLETED)

**Branch**: `feat/fr2-pr4-read-action-components`
**Commit**: `f3306ba` — `feat(ui): add BunkerHeader/Hero/MacroGrid/AuditSplit production components`
**Date**: 2026-07-18

### Tasks Completed

- [x] F1 CREATE `src/components/BunkerHeader.tsx`, `BunkerHero.tsx`, `MacroGrid.tsx`, `AuditSplit.tsx` — bare semantic HTML, no Tailwind (A5)
- [x] F2 EXTEND `src/components/__tests__/components.test.ts` — 6 render tests via `renderToStaticMarkup`
- [x] F3 GREEN — all gates pass including `npm run build`

### Gate Results

- **vitest run**: 107/107 tests pass (101 prev + 6 new render tests)
- **tsc --noEmit**: PASS
- **eslint .**: PASS
- **prettier --check .**: PASS
- **npm run build**: PASS (Next.js production build succeeds)
- **git status sandbox/**: CLEAN

### Files Changed

| File                                          | Action   | Description                                                                                                          |
| --------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/components/BunkerHeader.tsx`             | Created  | Renders `title` + `status` from `BunkerHeaderProps`                                                                  |
| `src/components/BunkerHero.tsx`               | Created  | Renders `bunkerTarget`, derives `progressPercent` internally (D4), renders `microProgress` + `microSurvivalCost`     |
| `src/components/MacroGrid.tsx`                | Created  | Renders 3 cards (label/value/trend) from `MacroGridProps`                                                            |
| `src/components/AuditSplit.tsx`               | Created  | Renders needs/wants columns + metadata (sourceFiles, dateRange, transactionCount, ownerId) + optimizationFooter      |
| `src/components/__tests__/components.test.ts` | Modified | Extended with 6 render tests: AuditSplit metadata, zero-inline-literals, Header, Hero, MacroGrid, zero-state render |

### Strict TDD Evidence

| Task  | RED (test first)                                             | GREEN (impl passes) | TRIANGULATE                                                                | REFACTOR             |
| ----- | ------------------------------------------------------------ | ------------------- | -------------------------------------------------------------------------- | -------------------- |
| F1-F3 | `vitest run components.test.ts` failed: module missing       | 11/11 pass (5 W-A + 6 W-F) | 6 render cases (metadata, zero-literals, header, hero, macro, zero-state) | N/A — presentational |

### Work Unit Evidence

| Evidence                                          | Required value                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `npx vitest run src/components/__tests__/components.test.ts` → 11/11 pass (19ms)                            |
| Runtime harness command/scenario and exact result | `renderToStaticMarkup(<AuditSplit {...}/>)` → HTML string contains all expected labels and metadata         |
| Rollback boundary                                 | Delete `src/components/{BunkerHeader,BunkerHero,MacroGrid,AuditSplit}.tsx`; drop render describes from test |

### Design Decisions

- **React import**: Components import `React` explicitly (`import React, { type ReactNode } from 'react'`) because `tsconfig.json` has `"jsx": "preserve"` and Vitest/esbuild needs the React global for JSX transformation in `.tsx` files.
- **Zero-state render**: Empty `BunkerFixtures` (from `buildBunkerViewModel([])`) renders all 4 components without NaN/undefined leaks. All 4 needs + 3 wants labels still appear (zero amounts).
- **Metadata rendering**: AuditSplit renders sourceFiles, dateRange, transactionCount, ownerId in a `<thead>` row — all from props, no inline literals.

### Sandbox Guard (A4)

Verified: `git status sandbox/` reports clean. No sandbox/ files touched, imported, or re-tracked.

---

## Git Diff Summary

### PR4 branch diff vs PR3 tip (W-E + W-F only):

```
 src/app/actions/__tests__/load-transactions.test.ts | 105 ++++++++++
 src/app/actions/loadTransactions.ts                 |  22 ++
 src/components/AuditSplit.tsx                       |  70 +++++++
 src/components/BunkerHeader.tsx                     |  18 ++
 src/components/BunkerHero.tsx                       |  33 +++
 src/components/MacroGrid.tsx                        |  28 +++
 src/components/__tests__/components.test.ts         | 221 +++++++++++++++++++++
 7 files changed, 497 insertions(+)
```

---

## Cumulative Status

- **W-A**: ✅ COMPLETE (PR1 — branch `feat/fr2-w-a-refreeze-pin`)
- **W-B**: ✅ COMPLETE (PR2 — branch `feat/fr2-pr2-env-labels`)
- **W-C**: ✅ COMPLETE (PR2 — branch `feat/fr2-pr2-env-labels`)
- **W-D**: ✅ COMPLETE (PR3 — branch `feat/fr2-pr3-aggregate`)
- **W-E**: ✅ COMPLETE (PR4 — branch `feat/fr2-pr4-read-action-components`)
- **W-F**: ✅ COMPLETE (PR4 — branch `feat/fr2-pr4-read-action-components`)
- **W-G**: 🔲 PENDING (PR5)

**Progress**: 6/7 work units complete (86%)

**Next**: PR5 = W-G (`app/page.tsx` async Server Component route wiring + final gates)
