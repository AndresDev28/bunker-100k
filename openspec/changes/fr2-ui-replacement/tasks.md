# Tasks: FR-2 UI Replacement (consume real store data)

> Environment: **[production]** (`src/` + `app/`). `strict_tdd: true` — every capability has named Vitest blocks that MUST pass natively before impl is accepted (spec §4).
> Hard guard (A4): **every** work unit MUST NOT touch/edit/import/re-track `sandbox/` — `git status sandbox/` stays clean. Restated per-unit below.

## Review Workload Forecast

| Field                              | Value                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Estimated changed lines (authored) | ~765 (W-A 75 · W-B 60 · W-C 50 · W-D 210 · W-E 125 · W-F 185 · W-G 60)  |
| 400-line budget risk               | High                                                                    |
| Chained PRs recommended            | Yes (design pre-staged W-A..W-G slice points; total ≫ 400)              |
| Suggested split                    | PR1 W-A → PR2 W-B+W-C → PR3 W-D → PR4 W-E+W-F → PR5 W-G                 |
| Delivery strategy                  | ask-on-risk                                                             |
| Chain strategy                     | pending (orchestrator resolves stacked-to-main vs feature-branch-chain) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                                                                                   | Likely PR | Focused test command                                                                                                             | Runtime harness                                            | Rollback boundary                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| W-A  | Re-freeze stub props + 2 unions (foot-gun pin). CREATE components.test.ts contract describe. RED→GREEN | PR1       | `npx vitest run src/components/__tests__/components.test.ts`                                                                     | N/A — contract assert, no runtime scenario                 | revert `frozenContracts.ts` + delete `src/components/__tests__/components.test.ts` |
| W-B  | env.ts helper + refactor ingestFromFolder to consume it                                                | PR2       | `npx vitest run src/lib/engine/__tests__/env.test.ts src/app/actions/__tests__/load-transactions.test.ts` (env block pre-action) | N/A — unit helper, FS only via tmpdir in store tests       | delete `env.ts`, revert `ingestFromFolder.ts` inline env, delete `env.test.ts`     |
| W-C  | port `src/lib/labels.ts` from `sandbox/src/labels.ts` (imports frozen unions)                          | PR2       | `npx tsc --noEmit`                                                                                                               | N/A — constants, asserted via render tests in W-F          | delete `src/lib/labels.ts`                                                         |
| W-D  | pure `buildBunkerViewModel.ts` + own Vitest block                                                      | PR3       | `npx vitest run src/lib/engine/__tests__/buildBunkerViewModel.test.ts`                                                           | N/A — pure transform, no I/O                               | delete `buildBunkerViewModel.ts` + its `.test.ts`                                  |
| W-E  | read Server Action `loadTransactions.ts` + tests                                                       | PR4       | `npx vitest run src/app/actions/__tests__/load-transactions.test.ts`                                                             | `loadTransactions({dataDir: tmpdir})` reads written JSON   | delete `loadTransactions.ts` + its `.test.ts`                                      |
| W-F  | 4 components `.tsx` + AuditSplit render tests                                                          | PR4       | `npx vitest run src/components/__tests__/components.test.ts`                                                                     | `renderToStaticMarkup(<AuditSplit {...}/>)`                | delete `src/components/*.tsx`, drop render describes from `components.test.ts`     |
| W-G  | `app/page.tsx` async SC + page zero-state test + final gates                                           | PR5       | `npx vitest run && npx tsc --noEmit && npx eslint . && npx prettier --check . && npm run build`                                  | `renderToStaticMarkup(<Page/>)` against tmpdir empty store | restore `app/page.tsx` FR-1 placeholder, drop page describe                        |

> Sandbox guard (per unit, A4): W-A NONE (touches `src/sandbox-bridge/` only, `sandbox/` untouched). W-B/W-C/W-D/W-E/W-F/W-G: zero `sandbox/` edits/imports/re-track — verify `git status sandbox/` clean at unit close.

## Strict-TDD Foot-Gun Pin

**W-A mirrors FR-1 W1/W2 discipline.** The re-freeze is the ONE forward mutation to existing code (frozen 8/6 + 3 empty prop stubs → 4/3 + 3 real interfaces). RED the contract assertion FIRST: create `src/components/__tests__/components.test.ts` with the `describe('frozen prop contracts…')` block asserting trimmed `BunkerHeroProps` (exactly 4 fields, no `incomeMedios`/`wantsTotal`/`saveRate`) + `NeedsSubcategory` cardinality 4 / `WantsSubcategory` cardinality 3 — these FAIL against current frozen. THEN re-freeze `frozenContracts.ts` to make them GREEN. Pin cardinalities/placeholder shapes BEFORE any wiring so later W-units consume a stable contract.

## Strict-TDD Block → Work-Unit Map (17 named blocks)

| #   | Named Vitest block                                                                 | Spec                     | Work unit               |
| --- | ---------------------------------------------------------------------------------- | ------------------------ | ----------------------- |
| 1   | `it('BunkerHeroProps exposes only the 4 trimmed BunkerSummary fields (A7)')`       | ui                       | **W-A**                 |
| 2   | `it('NeedsSubcategory has cardinality 4; WantsSubcategory cardinality 3 (A2)')`    | ui                       | **W-A**                 |
| 3   | `it('resolveDataDir defaults to /data when BUNKER_DATA_DIR unset')`                | read-action (REQ-READ-2) | **W-B**                 |
| 4   | `it('resolveOwnerId defaults to self')`                                            | read-action (REQ-READ-2) | **W-B**                 |
| 5   | `it('shares resolveDataDir/resolveOwnerId with ingestFromFolder — same data dir')` | read-action              | W-B + closed in **W-E** |
| 6   | `it('produces a zero-state BunkerFixtures for an empty Transaction[]')`            | aggregate                | **W-D**                 |
| 7   | `it('groups needs into 4 frozen / wants into 3 frozen')`                           | aggregate                | **W-D**                 |
| 8   | `it('derives sourceFiles/dateRange/transactionCount/ownerId from input')`          | aggregate                | **W-D**                 |
| 9   | `it('pins placeholder budget/percentage/monthsRemaining to FR-3 placeholders')`    | aggregate                | **W-D**                 |
| 10  | `it('reuses computeBunkerTarget (×6) — does not reimplement')`                     | aggregate                | **W-D**                 |
| 11  | `it('is pure — no I/O, no Date.now, referentially transparent')`                   | aggregate                | **W-D**                 |
| 12  | `it('returns persisted transactions for ownerId=self')`                            | read-action              | **W-E**                 |
| 13  | `it('returns [] for a missing owner without throwing')`                            | read-action              | **W-E**                 |
| 14  | `it('honors input.dataDir override for tests')`                                    | read-action              | **W-E**                 |
| 15  | `it('renders sourceFiles, dateRange, transactionCount, ownerId from props')`       | ui                       | **W-F**                 |
| 16  | `it('sources every visible string from src/lib/labels.ts — zero inline literals')` | ui                       | **W-F**                 |
| 17  | `it('renders all four components without throwing against an empty store')`        | ui                       | **W-G**                 |

## Phase 1: Foundation / Contracts (W-A) — foot-gun pin

- [x] A1 CREATE `src/components/__tests__/components.test.ts`: `describe('frozen prop contracts…')` with RED asserts for `BunkerHeroProps` keys (exactly `bunkerTarget|currentCash|monthsRemaining|survivalMonthlyCost`) + union cardinalities 4/3. RED: `vitest run` fails.
- [x] A2 MODIFY `src/sandbox-bridge/frozenContracts.ts`: re-freeze `NeedsSubcategory` → `housing|groceries|utilities|liabilities`; `WantsSubcategory` → `restoration|subscriptions|variables`; `BunkerHeaderProps`→`{title:string;status:string}`; `BunkerHeroProps`→`{bunkerTarget:Eur;currentCash:Eur;monthsRemaining:number;survivalMonthlyCost:Eur}`; `MacroGridProps`→`{cards:readonly{label:string;value:number|string;trend:string}[]}`. `BunkerSummary` + `AuditSplitProps` untouched.
- [x] A3 GREEN: `vitest run src/components/__tests__/components.test.ts` passes. `tsc --noEmit`, `eslint .`, `prettier --check .` green. `git status sandbox/` clean (guard A4).

## Phase 2: Shared Infra (W-B, W-C) — additive, build green

- [x] B1 CREATE `src/lib/engine/env.ts` exporting `resolveDataDir()` (return `process.env.BUNKER_DATA_DIR ?? '/data'`) and `resolveOwnerId()` (return `'self'`). Single `process.env.BUNKER_DATA_DIR` literal lives ONLY here.
- [x] B2 CREATE `src/lib/engine/__tests__/env.test.ts`: `it('resolveDataDir defaults to /data when BUNKER_DATA_DIR unset')`, `it('resolveOwnerId defaults to self')`, plus override-via-env cases. RED→GREEN.
- [x] B3 MODIFY `src/app/actions/ingestFromFolder.ts`: replace inline `input?.ownerId ?? 'self'` and `input?.dataDir ?? process.env.BUNKER_DATA_DIR ?? '/data'` with `resolveOwnerId()` / `resolveDataDir()` (override still honored via `input?`). Behavior identical. Run `vitest run` (existing store/ingest tests stay green).
- [x] C1 CREATE `src/lib/labels.ts`: port `HERO_TITLE`, `NEEDS_LABELS`, `WANTS_LABELS`, micro-metadata templates from `sandbox/src/labels.ts`; `NEEDS_LABELS: Record<NeedsSubcategory,string>` / `WANTS_LABELS: Record<WantsSubcategory,string>` typed against re-frozen unions (4/3). Sandbox NOT imported. `tsc --noEmit` green.

## Phase 3: Aggregate (W-D) — pure transform + own Vitest block

- [x] D1 CREATE `src/lib/engine/__tests__/buildBunkerViewModel.test.ts` with 6 RED `it` blocks (#6–#11). Pin documented placeholder constants (NOT formulae).
- [x] D2 CREATE `src/lib/engine/buildBunkerViewModel.ts`: pure `buildBunkerViewModel(transactions): BunkerFixtures`. Per design placeholders (each `// FR-3 REPLACES — non-final`): `survivalMonthlyCost=Σ|amt| tier==='needs'`; `currentCash=0`; `bunkerTarget=computeBunkerTarget(survivalMonthlyCost,wantsTotal)` (DELEGATE FR-1 stub, no reimpl); `monthsRemaining=currentCash>0&&cost>0?currentCash/cost:0`; `wantsTotal=Σ|amt| tier==='wants'`; `incomeMedios/saveRate/budget/percentage=0`; `progressPercent` derived in Hero (not here); `sourceFiles=[...new Set(t.sourceFile)]`; `dateRange={min/max(date)}` or `{"1970-01-01","1970-01-01"}` sentinel (D8); `transactionCount=transactions.length`; `ownerId=transactions[0]?.ownerId ?? 'self'`; `needs` 4 always / `wants` 3 always with zeros. No I/O, no `Date.now`/`new Date`.
- [x] D3 GREEN: `vitest run buildBunkerViewModel.test.ts` passes; `tsc --noEmit`, `eslint .`, `prettier --check .` green. Sandbox clean.

## Phase 4: Read Action (W-E) — surfaces persisted transactions

- [ ] E1 CREATE `src/app/actions/__tests__/load-transactions.test.ts` with 4 RED `it` blocks (#,#,#12–#14): tmpdir setup mirroring `store.test.ts`; assert persisted-read, missing-owner→`[]` no-throw, shared-helper parity, `input.dataDir` override.
- [ ] E2 CREATE `src/app/actions/loadTransactions.ts`: `'use server'`; `loadTransactions(input?): Promise<Transaction[]>` calling `resolveDataDir()`/`resolveOwnerId()` (override via `input?`) then `readStore`. MUST NOT reimplement reads/parsing. Closes block #5.
- [ ] E3 GREEN: `vitest run load-transactions.test.ts` passes; no `process.env.BUNKER_DATA_DIR` literal outside `env.ts` (grep gate); full `vitest run`, `tsc`, `eslint`, `prettier` green. Sandbox clean.

## Phase 5: Components + Render Tests (W-F)

- [ ] F1 CREATE `src/components/BunkerHeader.tsx`, `BunkerHero.tsx`, `MacroGrid.tsx`, `AuditSplit.tsx`: bare functional markup (semantic HTML, NO Tailwind/dark — A5). `BunkerHero` derives `progressPercent` internally. `AuditSplit` renders `sourceFiles`/`dateRange`/`transactionCount`/`ownerId`. All visible strings from `@/lib/labels`. No `sandbox/` imports (REQ-UI-1).
- [ ] F2 EXTEND `src/components/__tests__/components.test.ts`: add `describe('AuditSplit renders metadata')` with RED `it` #15 (metadata fields appear) + #16 (zero inline literals — every rendered string ∈ labels set). Render via `react-dom/server.renderToStaticMarkup` inside `.test.ts` (NO `vitest.config.mts` change).
- [ ] F3 GREEN: `vitest run components.test.ts` passes; `tsc --noEmit`, `eslint .`, `prettier --check .` green. No Tailwind class strings, no `globals.css`/`dark` edits (REQ-UI-5). Sandbox clean.

## Phase 6: Route Composition + Final Gates (W-G)

- [ ] G1 EXTEND `src/components/__tests__/components.test.ts`: add `describe('app/page.tsx zero-state')` RED `it` #17 — render `app/page.tsx` (mock `loadTransactions`→`[]`) without throwing, all four component markers present.
- [ ] G2 MODIFY `app/page.tsx`: async Server Component; `const txns=await loadTransactions()`; `const fixtures=buildBunkerViewModel(txns)`; render `<BunkerHeader>` `<BunkerHero>` `<MacroGrid>` `<AuditSplit>` with fields from `fixtures`. `app/layout.tsx` UNTOUCHED.
- [ ] G3 GREEN: `vitest run && tsc --noEmit && eslint . && prettier --check . && npm run build` all green. `git status sandbox/` clean (A4). `git diff app/layout.tsx` empty (A5).

## Threat Matrix

N/A per design — no routing/shell/subprocess/VCS/exec/process boundary. Rows omitted.

## Rollback (overall)

Revert W-A commit (re-freeze). Delete new files: `env.ts`, `buildBunkerViewModel.ts`, `labels.ts`, `loadTransactions.ts`, `src/components/*.tsx`, all new `.test.ts`. Restore `app/page.tsx` to FR-1 placeholder. Revert `ingestFromFolder.ts` to inline env. `sandbox/` untouched by construction.
