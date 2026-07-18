# Delta for bunker-ui

## Capability
ADDED — the production UI surface consuming the frozen `BunkerFixtures` contract. Cross-refs: project `spec §3` (component layout, deferred styling), `§4` (strict TDD); proposal A2 (frozen vocab/labels), A4 (sandbox untouched), A5 (un-styled), A7 (prop re-freeze), C2 (`@/components/*`).

## ADDED Requirements

### Requirement: REQ-UI-1: Component Placement & Imports
The components `BunkerHeader`, `BunkerHero`, `MacroGrid`, `AuditSplit` MUST live in `src/components/` and be importable via the `@/components/*` alias (C2). Production code MUST NOT import anything from `sandbox/`.

#### Scenario: Components live under src/components with alias
- GIVEN the production source tree
- WHEN `app/page.tsx` imports the four components
- THEN every import resolves through `@/components/BunkerHeader` etc.
- AND no import in `src/` or `app/` references a `sandbox/` path

### Requirement: REQ-UI-2: Frozen Prop Contracts (A2 + A7)
Prop shapes MUST be frozen by the re-frozen `BunkerHeaderProps`, `BunkerHeroProps`, `MacroGridProps`, and `AuditSplitProps` in `src/sandbox-bridge/frozenContracts.ts`. The re-freeze MUST trim to the 4-field `BunkerSummary` (`survivalMonthlyCost`, `bunkerTarget`, `currentCash`, `monthsRemaining`). `BunkerHeroProps` MUST expose `bunkerTarget`, `currentCash`, `monthsRemaining`, `survivalMonthlyCost` and derive `progressPercent` internally; it MUST drop sandbox-only `incomeMedios`, `wantsTotal`, `saveRate` from the prop shape. `NeedsSubcategory`/`WantsSubcategory` unions MUST be frozen to the §2 vocabulary (Needs 4, Wants 3).

#### Scenario: Prop shapes match the re-frozen contract
- GIVEN the re-frozen `frozenContracts.ts`
- WHEN components are type-checked against their props
- THEN `BunkerHeroProps` has exactly `bunkerTarget|currentCash|monthsRemaining|survivalMonthlyCost` (no `incomeMedios`/`wantsTotal`/`saveRate`)
- AND `NeedsSubcategory` / `WantsSubcategory` union cardinalities are 4 / 3

### Requirement: REQ-UI-3: AuditSplit Metadata Rendering
`AuditSplit` MUST render the `sourceFiles`, `dateRange`, `transactionCount`, and `ownerId` fields from its props (per the frozen `AuditSplitProps` metadata, untouched by the re-freeze). All rendered strings MUST come from `src/lib/labels.ts` — zero inline JSX string literals.

#### Scenario: AuditSplit renders metadata
- GIVEN an `AuditSplitProps` with `sourceFiles`, `dateRange`, `transactionCount`, `ownerId`
- WHEN `AuditSplit` renders
- THEN each metadata field appears in the output
- AND every visible string is sourced from `src/lib/labels.ts`

### Requirement: REQ-UI-4: Route Composition (thin Server Component)
`app/page.tsx` MUST be an async Server Component that calls `loadTransactions` (REQ-READ-1) → `buildBunkerViewModel` (REQ-AGG-1) → renders `<BunkerHeader>`, `<BunkerHero>`, `<MacroGrid>`, `<AuditSplit>`. When the store is empty it MUST render the zero-state from REQ-AGG-5 (no crash, no "no data" exception).

#### Scenario: Renders the four components against real data
- GIVEN a store with persisted transactions for `ownerId='self'`
- WHEN the page is requested
- THEN the rendered output contains all four components' markers
- AND those components received the `BunkerFixtures` from the aggregate

#### Scenario: Renders zero-state on empty store
- GIVEN an empty store (`loadTransactions()` returns `[]`)
- WHEN the page is requested
- THEN the page renders without throwing
- AND the components received the zero-state `BunkerFixtures`

### Requirement: REQ-UI-5: Un-styled Shipment (A5)
The UI MUST ship functional markup only — semantic HTML, no Tailwind utility classes, no `globals.css` edit, no `dark` class on `<html>`, no theme wiring. `app/layout.tsx` MUST remain untouched in this change.

#### Scenario: No styling artifacts in the change
- GIVEN the FR-2 diff
- WHEN inspected
- THEN no Tailwind class strings, no `globals.css` modification, and no `dark` class on `<html>` are introduced
- AND `app/layout.tsx` is byte-identical to `main`

### Requirement: REQ-UI-6: Sandbox Immutability (A4)
`sandbox/` MUST NOT be imported, edited, re-tracked, or otherwise touched by any FR-2 artifact. The working tree of `sandbox/` MUST be byte-identical to `main`.

#### Scenario: Sandbox untouched
- GIVEN the FR-2 branch
- WHEN `git status sandbox/` runs
- THEN it reports no changes (and no new tracked files under `sandbox/`)

## Strict-TDD Test Blocks (cross-ref spec §4)
The following named Vitest blocks MUST pass natively before implementation is accepted. Component tests favor prop-shape + minimal-render assertions; snapshot tests are used ONLY if the project's Vitest config supports them.
- `describe('frozen prop contracts: BunkerHeaderProps / BunkerHeroProps / MacroGridProps / AuditSplitProps')`
  - `it('BunkerHeroProps exposes only the 4 trimmed BunkerSummary fields (A7)')`
  - `it('NeedsSubcategory has cardinality 4; WantsSubcategory has cardinality 3 (A2)')`
- `describe('AuditSplit renders metadata')`
  - `it('renders sourceFiles, dateRange, transactionCount, ownerId from props')`
  - `it('sources every visible string from src/lib/labels.ts — zero inline literals')`
- `describe('app/page.tsx zero-state')`
  - `it('renders all four components without throwing against an empty store')`

## Cross-references
- Project `spec §3` (component layout + deferred dark-minimalist styling), `§4` (strict-TDD gate).
- Proposal A2, A4, A5, A7, C2.
- See also `bunker-read-action` (REQ-READ-1) and `bunker-aggregate` (REQ-AGG-1, REQ-AGG-5).