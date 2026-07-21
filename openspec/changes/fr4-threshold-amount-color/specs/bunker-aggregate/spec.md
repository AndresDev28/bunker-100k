# Delta Spec: fr4-threshold-amount-color — bunker-aggregate

> **Status**: ADD REQ-AGG-6 (Threshold Derive Rule). Produces `BunkerFixtures.threshold`,
> consumed by REQ-UI-17 (bunker-ui delta, this change). Purity (REQ-AGG-1) and
> zero-state safety (REQ-AGG-5) are preserved.

## ADDED Requirements

### Requirement: REQ-AGG-6: Threshold Derive Rule

`buildBunkerViewModel` MUST derive `BunkerFixtures.threshold`
(`'warning' | 'alert' | undefined`) as a pure function of the already-computed
`currentCash` and `bunkerTarget`, using two numeric cuts against `bunkerTarget`:

- `'alert'` ← `|currentCash| < 5% × bunkerTarget`
- `'warning'` ← `5% × bunkerTarget ≤ |currentCash| < 20% × bunkerTarget`
- `undefined` ← otherwise (healthy), or when `bunkerTarget ≤ 0` (no stable denominator)

The rule MUST be expressible as a pure, unit-testable predicate over
`(currentCash, bunkerTarget)`; it MUST NOT read clocks, env, or perform I/O
(REQ-AGG-1), MUST NOT mutate its input, and MUST remain zero-state safe (REQ-AGG-5).
The derived value feeds REQ-UI-17's threshold branches.

#### Scenario: Alert band below five percent

- **GIVEN** `bunkerTarget = 6000` and `currentCash = 100` (< 300)
- **WHEN** the derive rule runs
- **THEN** `threshold === 'alert'`

#### Scenario: Warning band between five and twenty percent

- **GIVEN** `bunkerTarget = 6000` and `currentCash = 600` (10%)
- **WHEN** the derive rule runs
- **THEN** `threshold === 'warning'`

#### Scenario: Healthy at or above twenty percent

- **GIVEN** `bunkerTarget = 6000` and `currentCash = 3000` (50%)
- **WHEN** the derive rule runs
- **THEN** `threshold === undefined`

#### Scenario: Lower boundary inclusive

- **GIVEN** `bunkerTarget = 6000` and `currentCash = 300` (exactly 5%)
- **WHEN** the derive rule runs
- **THEN** `threshold === 'warning'` (NOT `'alert'`)

#### Scenario: Upper boundary inclusive

- **GIVEN** `bunkerTarget = 6000` and `currentCash = 1200` (exactly 20%)
- **WHEN** the derive rule runs
- **THEN** `threshold === undefined` (NOT `'warning'`)

#### Scenario: Zero-state has no denominator

- **GIVEN** `buildBunkerViewModel([])`
- **WHEN** the result is inspected
- **THEN** `threshold === undefined` — no `NaN`, no throw (REQ-AGG-5 holds)

#### Scenario: Pure and deterministic

- **GIVEN** an identical `Transaction[]` fixture
- **WHEN** `buildBunkerViewModel` is called twice
- **THEN** both results carry deep-equal `threshold` values (REQ-AGG-1 holds)

#### Scenario: Aggregate wiring with placeholder cash

- **GIVEN** a non-empty `Transaction[]` yielding `bunkerTarget > 0` while `currentCash`
  remains the pinned FR-3 placeholder `0`
- **WHEN** `buildBunkerViewModel` runs
- **THEN** `threshold === 'alert'`; the warning/healthy bands become reachable through
  the public API only when the `currentCash` placeholder is replaced — until then the
  pure predicate carries band coverage

## Strict-TDD Test Blocks (cross-ref spec §4)

- `describe('threshold derive rule (REQ-AGG-6)')`
  - `it('maps |currentCash| < 5% of bunkerTarget to alert')`
  - `it('maps the [5%, 20%) band to warning — both boundaries inclusive-tested')`
  - `it('maps ≥20% and bunkerTarget ≤ 0 to undefined')`
  - `it('is pure — deterministic, no Date.now / I/O, deep-equal on repeat calls')`
