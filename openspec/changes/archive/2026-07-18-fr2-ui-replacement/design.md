# Design: FR-2 UI Replacement

## Technical Approach

`app/page.tsx` (async SC) → `loadTransactions` (Server Action) → `readStore` → `buildBunkerViewModel` (pure) → four un-styled components on re-frozen `BunkerFixtures`. One forward mutation: `frozenContracts.ts` re-freeze. Rest additive.

## Architecture Decisions

- **D1 Read path — A3 Server Action.** Symmetry w/ `ingestFromFolder`; client refresh unlock (REQ-READ-1).
- **D2 Env helper — `src/lib/engine/env.ts` (resolveDataDir/resolveOwnerId).** REQ-READ-2; one `process.env.BUNKER_DATA_DIR` literal.
- **D3 Re-freeze vocab — A2 (4/3).** Fix FR-1 8/6 drift; spec §2 truth; sandbox labels port.
- **D4 Re-freeze props — F1-trimmed.** A7 drops `progressPercent/incomeMedios/wantsTotal/saveRate`; Hero derives `progressPercent`.
- **D5 `BunkerSummary` UNCHANGED (4 fields).** A7 mutates prop shapes, not summary.
- **D6 Aggregate — G1 pure `src/lib/engine/buildBunkerViewModel.ts`.** REQ-AGG-1; testable, no React.
- **D7 Components — C2 `src/components/*` via `@/components/*`.** Cohesion w/ `src/lib/`.
- **D8 `dateRange` zero-state — `"1970-01-01"` both fields if empty.** Keeps contract non-nullable; UI renders "—".
- **D9 Tailwind/dark — NONE (A5).** §3 polish deferred.
- **D10 `sandbox/` — UNTOUCHED (A4).** FR-1 PR-7 lesson.

## Data Flow

```
CSV → ingestFromFolder → state/transactions.json
                            │
loadTransactions → env.ts → readStore
  (REQ-READ-1)       │
                     ▼
  buildBunkerViewModel(transactions): BunkerFixtures  (pure)
                     │
                     ▼
  app/page.tsx (SC) → <BunkerHeader> <BunkerHero> <MacroGrid> <AuditSplit>
```

## File Changes

- **MODIFY** `src/sandbox-bridge/frozenContracts.ts` — re-freeze 3 stub props + 2 unions (only forward mutation)
- **MODIFY** `src/app/actions/ingestFromFolder.ts` — replace inline env w/ shared helper; behavior identical
- **MODIFY** `app/page.tsx` — placeholder → async SC
- **CREATE** `src/lib/engine/env.ts` — resolveDataDir/resolveOwnerId
- **CREATE** `src/lib/engine/buildBunkerViewModel.ts` — pure `Transaction[]→BunkerFixtures`
- **CREATE** `src/lib/labels.ts` — port from `sandbox/src/labels.ts`
- **CREATE** `src/app/actions/loadTransactions.ts` — `'use server'` read action
- **CREATE** `src/components/{BunkerHeader,BunkerHero,MacroGrid,AuditSplit}.tsx` — un-styled markup
- **CREATE** `src/lib/engine/__tests__/{env,buildBunkerViewModel}.test.ts`
- **CREATE** `src/app/actions/__tests__/load-transactions.test.ts`
- **CREATE** `src/components/__tests__/components.test.ts` — render via `react-dom/server.renderToStaticMarkup`
- **UNTOUCHED** `app/layout.tsx`, `sandbox/**` (A4/A5)

## Interfaces / Contracts (re-freeze plan)

```ts
// BEFORE (FR-1)
type NeedsSubcategory = 'food'|'transport'|'housing'|'utilities'|'health'|'education'|'subscriptions'|'other_needs';
type WantsSubcategory = 'restoration'|'entertainment'|'shopping'|'subscriptions'|'travel'|'other_wants';
type BunkerHeaderProps = Record<string, never>;
type BunkerHeroProps   = Record<string, never>;
type MacroGridProps    = Record<string, never>;

// AFTER (FR-2)
type NeedsSubcategory = 'housing'|'groceries'|'utilities'|'liabilities';   // 4
type WantsSubcategory = 'restoration'|'subscriptions'|'variables';         // 3
interface BunkerHeaderProps { title: string; status: string }              // FR-0 shape
interface BunkerHeroProps   { bunkerTarget: Eur; currentCash: Eur; monthsRemaining: number; survivalMonthlyCost: Eur }  // A7 trimmed
interface MacroGridProps    { cards: readonly { label: string; value: number|string; trend: string }[] }
interface BunkerSummary     { /* UNCHANGED */ survivalMonthlyCost: Eur; bunkerTarget: Eur; currentCash: Eur; monthsRemaining: number; }
```

`AuditSplitProps` UNCHANGED (frozen FR-1 W-1). `dateRange: {from: ISODate; to: ISODate}` non-nullable; empty → `{"1970-01-01","1970-01-01"}`.

## Aggregate Placeholders (each `// FR-3 REPLACES — non-final`)

`survivalMonthlyCost = Σ|amt| tier==='needs'`. `currentCash = 0`. **`bunkerTarget = computeBunkerTarget(survivalMonthlyCost, wantsTotal)`** — delegate FR-1 stub, DO NOT reimplement. `monthsRemaining = currentCash>0 && cost>0 ? currentCash/cost : 0`. `progressPercent = bunkerTarget>0 ? currentCash/bunkerTarget*100 : 0` (derived in Hero). `wantsTotal = Σ|amt| tier==='wants'`. `incomeMedios/saveRate/budget/percentage = 0`. `sourceFiles = [...new Set(t.sourceFile)]`. `dateRange = min/max(date)` or `"1970-01-01"` (D8). `transactionCount = transactions.length`. `ownerId = transactions[0]?.ownerId ?? 'self'` (A4). `needs[i].amount = Σ|amt| tier==='needs' && sub===k` else 0 (4 always). `wants[i].amount = Σ|amt| tier==='wants' && sub===k` else 0 (3 always). Zero-state: every numeric `0`, full-length arrays, no `NaN/undefined`.

## Re-freeze Consumer Verification

Production grep `src/`+`app/`: **ZERO existing imports** of `frozenContracts` symbols. Verified: `category.ts` uses own `CategoryRef { tier; subcategory: string }`; `classify.ts` returns literals (no union dep); `store.ts`, `ingestFromFolder.ts`, `app/page.tsx` no imports. **Impact on existing code = zero.** Staged W-units (green at every commit): W-A re-freeze → W-B `env.ts`+refactor → W-C `labels.ts` → W-D `buildBunkerViewModel.ts`+tests → W-E `loadTransactions.ts`+tests → W-F components+render tests → W-G `app/page.tsx` async SC + final gates.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | aggregate purity + zero-state + placeholders | `buildBunkerViewModel.test.ts` (Given/When/Then) |
| Unit | env defaults + override | `env.test.ts` |
| Unit | read action semantics | `load-transactions.test.ts` (tmpdir, mirrors `store.test.ts`) |
| Render | components + labels + zero-state | `components.test.ts` via `react-dom/server.renderToStaticMarkup` — no vitest config change |
| Contract | re-freezed prop shapes + cardinality | same file — `Object.keys` length asserts |

No snapshots (FR-1 pattern is explicit assertions).

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No data migration. Rollback: revert W-A; delete new files; restore `app/page.tsx` placeholder; restore `ingestFromFolder.ts` inline env. `sandbox/` untouched.

## SDD Decisions Log

- **Re-freeze (D3/D4)** supersedes FR-1 8/6-vocab + empty props; spec §2 canonical.
- **Read path (D1)** supersedes exploration's "SC direct read" per user choice.
- **Stylize later (D9)** supersedes FR-1 placeholder; first prod UI ships un-styled.
- **Placeholder discipline (D6+formulas)** — every non-trivial derivation tagged; `bunkerTarget` delegates FR-1 stub.
- **`dateRange` sentinel (D8)** `"1970-01-01"` over `null` to keep contract non-nullable.

## Open Questions

None. A1–A7, A3/C2/G1/F1-trimmed, and `dateRange` sentinel all resolved.

## Risk Note (tasks phase)

400-line budget = **HIGH**. Forecast: `Decision needed before apply: Yes`, `Chained PRs recommended: Yes`, `400-line budget risk: High`. W-A through W-G are natural chained-PR slice points.

### D11. Server Component Async Boundary (Added Post-Verify)
`export const dynamic = 'force-dynamic'` en `app/page.tsx`.
**Razón:** `readStore` lee el filesystem en runtime; React Server Components están cacheados por defecto. Necesitamos que la página se regenere en cada request durante desarrollo.
