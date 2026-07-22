# Tasks: FR-4 — Threshold field + amountColorClass upgrade

## Review Workload Forecast

| Field                   | Value               |
| ----------------------- | ------------------- |
| Estimated changed lines | ~180 (code + tests) |
| 400-line budget risk    | Low                 |
| Chained PRs recommended | No                  |
| Suggested split         | Single PR           |
| Delivery strategy       | ask-always          |
| Chain strategy          | pending             |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                   | Likely PR | Focused test command      | Runtime harness                | Rollback boundary                                      |
| ---- | ---------------------- | --------- | ------------------------- | ------------------------------ | ------------------------------------------------------ |
| 1    | All phases (single PR) | PR 1      | `pnpm test:run` all green | `pnpm build && pnpm lint` pass | Revert entire FR-4 diff; no unrelated surfaces touched |

## Phase 1: Pure Predicate — deriveThreshold (RED → GREEN)

- [x] 1.1 **RED**: Create `src/lib/engine/__tests__/deriveThreshold.test.ts` with 8 failing tests covering REQ-AGG-6 scenarios: alert band (<5%), warning band ([5%,20%)), healthy (≥20%), lower boundary (exactly 5% → warning), upper boundary (exactly 20% → undefined), zero-state (bunkerTarget=0 → undefined), purity (deterministic deep-equal), and placeholder-cash wiring (currentCash=0, target>0 → alert).
- [x] 1.2 **GREEN**: Create `src/lib/engine/deriveThreshold.ts` exporting `Threshold` type and `deriveThreshold(currentCash, bunkerTarget)` pure function. All 8 tests pass. Verify: `pnpm test:run -- deriveThreshold`.

## Phase 2: Pure Helper — amountColorClass (RED → GREEN)

- [x] 2.1 **RED**: Create `src/lib/engine/__tests__/amountColor.test.ts` with 6 failing tests covering REQ-UI-17 return matrix: positive→emerald-400, negative→red-400, zero→zinc-400, warning→fuchsia-500, alert→pink-400, threshold-over-sign precedence (positive amount + alert → pink-400).
- [x] 2.2 **GREEN**: Create `src/lib/engine/amountColor.ts` exporting `amountColorClass(amount, threshold?)` importing `Threshold` from `deriveThreshold.ts`. All 6 tests pass. Verify: `pnpm test:run -- amountColor`.

## Phase 3: Aggregate Wiring (RED → GREEN)

- [x] 3.1 **RED**: Extend `src/lib/engine/__tests__/buildBunkerViewModel.test.ts` with 2 failing integration tests: (a) non-empty txs with target>0 yields `threshold === 'alert'` (placeholder cash=0), (b) empty txs yields `threshold === undefined`.
- [x] 3.2 **Modify** `src/sandbox-bridge/frozenContracts.ts`: add `threshold?: 'warning' | 'alert'` to `BunkerFixtures` only. No other interface changes.
- [x] 3.3 **GREEN**: Modify `src/lib/engine/buildBunkerViewModel.ts` — import `deriveThreshold`, compute `threshold` from `(currentCash, bunkerTarget)`, set on returned fixtures. Integration tests pass. Verify: `pnpm test:run -- buildBunkerViewModel`.

## Phase 4: Component Wiring (RED → GREEN)

- [x] 4.1 **RED**: Extend `src/components/__tests__/components.test.ts` with 3 failing tests: MacroGrid renders `text-fuchsia-500` when threshold=warning, `text-pink-400` when threshold=alert, and `text-emerald-400` when threshold=undefined with positive value.
- [x] 4.2 **GREEN**: Modify `src/components/MacroGrid.tsx` — remove inline `amountColorClass`, import from `@/lib/engine/amountColor`, extend local props with `threshold?: Threshold`, consume in render. Modify `app/page.tsx` — thread `threshold={fixtures.threshold}` to `<MacroGrid>`. Component tests pass. Verify: `pnpm test:run -- components`.

## Phase 5: Guards & Verification

- [x] 5.1 Run full gate: `pnpm test:run && pnpm typecheck && pnpm lint && pnpm format:check && pnpm build`. All green.
- [x] 5.2 Verify no production source outside allowed set is touched: `BunkerHeader`, `BunkerHero`, `AuditSplit` unchanged. Only `frozenContracts.ts` diff is the additive `threshold?` field on `BunkerFixtures`.
