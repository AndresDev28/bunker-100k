# Delta for bunker-aggregate

## Capability
ADDED — the pure view-model transform that maps persisted `Transaction[]` to the frozen `BunkerFixtures` contract consumed by the UI. Cross-refs: project `spec §2` (FR-2 tiers, FR-3 deferred math), `§4` (strict TDD); proposal A2 (frozen vocab), A6 (placeholder discipline), G1 (pure module under `src/lib/engine/`).

## ADDED Requirements

### Requirement: REQ-AGG-1: Pure Transform
The system MUST expose `buildBunkerViewModel(transactions: Transaction[]): BunkerFixtures` as a PURE function in `src/lib/engine/buildBunkerViewModel.ts`. The function MUST NOT perform I/O, MUST NOT read `Date.now()`/`new Date()` (deterministic given input only), MUST NOT import Node or Next.js server primitives, and MUST be referentially transparent. The module MUST live under `src/lib/engine/` (G1).

#### Scenario: Pure & deterministic
- GIVEN an identical `Transaction[]` fixture
- WHEN `buildBunkerViewModel` is called twice
- THEN both results are deep-equal
- AND no file, env, or clock access occurs during the call

### Requirement: REQ-AGG-2: AuditSplit Category Lines (A2 vocabulary)
The transform MUST produce `AuditSplitProps.needs` / `AuditSplitProps.wants` as `CategoryLine<K>[]` grouped EXACTLY under the frozen §2 vocabulary: Needs `housing|groceries|utilities|liabilities` (4), Wants `restoration|subscriptions|variables` (3). Each `CategoryLine` MUST carry `budget` and `percentage` fields. Classification of transactions into subcategories is OUT-OF-SCOPE (sibling change `fr2b-classification`, A1) — FR-2 produces a degenerate single-`salary` income band and groups `variables` etc. per the sign-stub data already present on the stored transactions.

#### Scenario: Four Needs / three Wants lines, A2 frozen
- GIVEN a `Transaction[]` of any shape
- WHEN `buildBunkerViewModel` runs
- THEN `needs.length === 4` keyed `housing|groceries|utilities|liabilities`
- AND `wants.length === 3` keyed `restoration|subscriptions|variables`
- AND every line exposes both `budget` and `percentage`

### Requirement: REQ-AGG-3: Metadata From Input
The transform MUST populate `AuditSplitProps` metadata — `sourceFiles`, `dateRange`, `transactionCount`, `ownerId` — derived solely from the input `Transaction[]` (no env reads). `transactionCount` MUST equal `transactions.length`; `dateRange` MUST reflect min/max transaction dates (or a defined zero-state sentinel when empty).

#### Scenario: Metadata reflects input
- GIVEN 3 transactions across two source files with dates `2026-01-10` and `2026-02-15`
- WHEN `buildBunkerViewModel` runs
- THEN `transactionCount === 3`, `sourceFiles` lists both files, and `dateRange` spans Jan–Feb 2026

### Requirement: REQ-AGG-4: Placeholder Discipline (A6)
Placeholder derivations — `budget`, `percentage`, `monthsRemaining`, `progressPercent`, `saveRate`, any monthly averages — MUST be clearly marked `// FR-3 REPLACES — non-final` at their definition site. The spec FORBIDS treating placeholder values as production math (FR-3 owns the dynamic math). `bunkerTarget` derivation MUST reuse the existing `computeBunkerTarget` stub (`survivalMonthlyCost × 6`) from the FR-1 aggregate — it MUST NOT be reimplemented here.

#### Scenario: Placeholder values are pinned, not formulae
- GIVEN a fixed input fixture
- WHEN aggregate tests assert placeholder fields
- THEN the tests assert the documented placeholder values (e.g., a constant), NOT a real monthly-average formula
- AND every placeholder carries the `// FR-3 REPLACES — non-final` marker

### Requirement: REQ-AGG-5: Zero-State Safety
Given an empty `Transaction[]`, the transform MUST return a valid `BunkerFixtures` with zero/defined values — no `NaN`, `undefined`, or thrown error — so the UI can render an "empty store" state.

#### Scenario: Empty input → zero-state fixtures
- GIVEN `buildBunkerViewModel([])`
- WHEN the result is inspected
- THEN every numeric field is `0` (not `NaN`/`undefined`), every array is the frozen-length zero-state, and `transactionCount === 0`

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
The following named Vitest block MUST pass natively before implementation is accepted:
- `describe('aggregate: buildBunkerViewModel')`
  - `it('produces a zero-state BunkerFixtures for an empty Transaction[]')`
  - `it('groups needs into the 4 frozen subcategories and wants into the 3 frozen')`
  - `it('derives sourceFiles / dateRange / transactionCount / ownerId from input')`
  - `it('pins placeholder budget/percentage/monthsRemaining to documented FR-3 placeholders, not formulae')`
  - `it('reuses computeBunkerTarget (survivalMonthlyCost × 6) — does not reimplement')`
  - `it('is pure — no I/O, no Date.now, referentially transparent')`
- `describe('threshold derive rule (REQ-AGG-6)')` (FR-4)
  - `it('maps |currentCash| < 5% of bunkerTarget to alert')`
  - `it('maps the [5%, 20%) band to warning — both boundaries inclusive-tested')`
  - `it('maps ≥20% and bunkerTarget ≤ 0 to undefined')`
  - `it('is pure — deterministic, no Date.now / I/O, deep-equal on repeat calls')`

## Cross-references
- Project `spec §2` (FR-2 tiers, FR-3 deferral), `§4` (strict-TDD gate).
- Baseline `transaction-store` (Transaction shape).
- Proposal A1, A2, A6, G1.
- See also `bunker-ui` (REQ-UI-17) — consumes `BunkerFixtures.threshold`.
- See also `fr4-threshold-amount-color` archive (2026-07-22, PR #13 → `973cdeb`): REQ-AGG-6 ADDED with 8 scenarios; pure predicate `deriveThreshold(currentCash, bunkerTarget)` lives at `src/lib/engine/deriveThreshold.ts`.