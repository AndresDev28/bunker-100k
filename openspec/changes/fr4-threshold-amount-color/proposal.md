# Proposal: fr4-threshold-amount-color

## Intent

Lift the FR-3-era relaxation of `amountColorClass` by introducing warning/alert
semantic thresholds on amounts. Today the helper maps sign → color only (3 branches,
`src/components/MacroGrid.tsx:13-17`); a follow-up was contractually reserved in
`openspec/changes/archive/2026-07-20-fr3-ui-styling/verify-report-official.md:146-148`:

> _Follow-up FR required for warning/alert thresholds — requires `threshold?: 'warning' | 'alert'` field on `BunkerFixtures` aggregate, updated `amountColorClass(amount, threshold?)` signature, and a T8 reversal to update frozen contracts._

FR-4 is that follow-up. Without it, `pink-400` (reserved per REQ-UI-13.Scenario#2)
and `fuchsia-500` (REQ-UI-17 deferred) can never land concretely in the bundle, and
the aggregate cannot express financial urgency.

## Assumptions (locked — do not reopen)

1. **Source = hybrid scoped**: heuristic default + optional in-memory override on
   `BunkerFixtures` ONLY. Real persistence is deferred (see Non-Goals).
2. **Rule = two numeric cuts against `bunkerTarget`** (rationale: `bunkerTarget`
   is the user-stated 6-month survival goal already in REQ-AGG-1, so every owner
   has a stable denominator; cuts at 20% / 5% give visible-but-not-alarming band
   separation):
   - `alert` ← `|value| < 5%` of `bunkerTarget`
   - `warning` ← `5% ≤ |value| < 20%` of `bunkerTarget`
   - else `undefined` (sign-only mapping)
3. **Granularity = per aggregate (Approach B)**: `threshold?: 'warning' | 'alert'`
   on `BunkerFixtures` / derived in `buildBunkerViewModel`.
4. **Testability = extract helper**: move `amountColorClass` to pure module
   `src/lib/engine/amountColor.ts` with its own Vitest suite — closes the FR-3
   coverage gap (NICE-TO-HAVE on archive line 137).

## Scope

### In Scope

- New field `threshold?: 'warning' | 'alert'` on `BunkerFixtures`
  (frozenContracts bump — T8 reversal).
- Pure helper module `src/lib/engine/amountColor.ts` exporting
  `amountColorClass(amount: number, threshold?: 'warning' | 'alert'): string`.
- `MacroGrid.tsx` becomes a thin consumer passing `fixtures.threshold` through.
- Heuristic derive step in `buildBunkerViewModel` (pure over input — REQ-AGG-1 safe).
- Vitest unit suite for `amountColor.ts` + derive-rule tests in
  `buildBunkerViewModel.test.ts`.

### Out of Scope

- **FR-5: persist user thresholds across sessions + UI settings + schema bump**
  (explicit non-goal). Approach C / `Transaction.threshold` / `STORE_SCHEMA_VERSION=2`
  rejected for FR-4.
- Per-card thresholds (Approach A) — possible follow-up.
- Reworking the `value: number | string` `MacroGridProps.cards[i]` silent-cast.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bunker-ui`: REQ-UI-17 scenarios `Warning / alert thresholds (deferred)`,
  `No view-model mutation`, and `Helper signature is single-argument in FR-3` →
  MODIFIED to lift the relaxation and accept the new signature.
- `bunker-aggregate`: ADD new requirement `REQ-AGG-6: Threshold Derive Rule`
  covering the 20% / 5% cuts, purity constraint, and reference to REQ-UI-17.

## Approach

Approach B (aggregate-level) verbatim per FR-3 follow-up text. `MacroGrid` reads
`fixtures.threshold` and forwards to `amountColorClass`. The `frozenContracts.ts`
byte-identical guard from FR-3 is **intentionally reversed (T8)** — the proposal
narrows the relaxation so future FRs can ship without re-relaxing.

## Affected Areas

| Area                                                    | Impact   | Description                                                              |
| ------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| `src/components/MacroGrid.tsx`                          | Modified | Replace inline helper with import; pass `fixtures.threshold`             |
| `src/lib/engine/amountColor.ts`                         | New      | Pure module, exported `amountColorClass`                                 |
| `src/lib/engine/__tests__/amountColor.test.ts`          | New      | Unit suite: 6 return paths                                               |
| `src/sandbox-bridge/frozenContracts.ts`                 | Modified | Add `threshold?: 'warning' \| 'alert'` to `BunkerFixtures` (T8 reversal) |
| `src/lib/engine/buildBunkerViewModel.ts`                | Modified | Pure derive step (alert/warning via 5%/20% cuts)                         |
| `src/lib/engine/__tests__/buildBunkerViewModel.test.ts` | Modified | Add derive-rule tests                                                    |
| `openspec/specs/bunker-ui/spec.md`                      | Modified | REQ-UI-17 scenarios                                                      |
| `openspec/specs/bunker-aggregate/spec.md`               | Modified | New REQ-AGG-6                                                            |

## Risks

| Risk                                                    | Likelihood | Mitigation                                                        |
| ------------------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| Token omission (`pink-400`/`fuchsia-500`) in CSS bundle | Low        | `next build` gate (FR-3 verify precedent)                         |
| Aggregate purity break in derive step                   | Low        | Strict-TDD pure tests + REQ-AGG-1 fixture reuse                   |
| Reviewer confusion on T8 reversal                       | Med        | Proposal text + cite to FR-3 archive explicitly explains reversal |
| `value: number \| string` silent cast interacts badly   | Low        | Out of scope; documented                                          |
| Review-budget overrun                                   | Low        | ~40-90 net lines fits 400-line budget with headroom               |

## Rollback Plan

Revert commits introducing `threshold` field + helper module; restore
`frozenContracts.ts` to its FR-3-archived byte state and pin
`amountColorClass` signature back to `(amount: number): string`. Heuristic
cuts are isolated to `buildBunkerViewModel` — revert that file alone removes
all behavior change.

## Dependencies

- FR-3 archived (`openspec/changes/archive/2026-07-20-fr3-ui-styling/`) must
  remain read-only; this FR lifts its relaxed REQ-UI-17 scenarios in-place.
- `next build` available as bundle-presence gate for `pink-400`/`fuchsia-500`.

## Success Criteria

- [ ] `BunkerFixtures.threshold` field added; `frozenContracts.ts` updated
- [ ] `amountColorClass(amount, threshold?)` extracted to `src/lib/engine/amountColor.ts`
- [ ] Pure unit suite passes (≥6 cases per return path)
- [ ] `buildBunkerViewModel` derive rule: 20%/5% cuts, deterministic
- [ ] `npm run test:run` green (existing 111 tests still pass)
- [ ] `next build` bundle includes `pink-400` and `fuchsia-500`
- [ ] REQ-UI-17 modified scenarios + new REQ-AGG-6 written in `sdd-spec` phase
- [ ] T8 reversal documented inline (no reviewer surprise)
