# Delta for bunker-ui

## Capability
ADDED — the production UI surface consuming the frozen `BunkerFixtures` contract. Cross-refs: project `spec §3` (component layout, deferred styling), `§4` (strict TDD); proposal A2 (frozen vocab/labels), A4 (sandbox untouched), A5 (un-styled), A7 (prop re-freeze), C2 (`@/components/*`).

> **Note 2026-07-20**: REQ-UI-5 SUPERSEDED by REQ-UI-12..17. Two REQ-UI scenarios are intentionally relaxed (REQ-UI-13 pink-400 reserved for future FRs; REQ-UI-17 warning/alert thresholds deferred until aggregate exposes a threshold field). See the relaxed scenarios for the precise language.

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

### Requirement: REQ-UI-5: Un-styled Shipment (A5) — SUPERSEDED by fr3-ui-styling

> **Status**: SUPERSEDED 2026-07-20 by fr3-ui-styling. The styling contract for the bunker-ui surface now lives in REQ-UI-12..17 (added below). Original wording preserved in `openspec/changes/archive/2026-07-18-fr2-ui-replacement/specs/bunker-ui/spec.md` for traceability.

#### Scenario: SUPERSEDED marker present
- GIVEN the fr3-ui-styling archive completed
- WHEN the canonical bunker-ui spec is read
- THEN REQ-UI-5 carries a SUPERSEDED marker pointing to REQ-UI-12..17
- AND the original wording remains byte-for-byte in the FR-2 archived copy.

### Requirement: REQ-UI-6: Sandbox Immutability (A4)
`sandbox/` MUST NOT be imported, edited, re-tracked, or otherwise touched by any FR-2 artifact. The working tree of `sandbox/` MUST be byte-identical to `main`.

#### Scenario: Sandbox untouched
- GIVEN the FR-2 branch
- WHEN `git status sandbox/` runs
- THEN it reports no changes (and no new tracked files under `sandbox/`)

### Requirement: REQ-UI-12: Dark-only Root Contract
The `bunker-ui` surface MUST render against a dark-only root with zinc-950 base background.

#### Scenario: Dark root class applied at first paint
- **GIVEN** the FR-3 implementation is deployed
- **WHEN** the browser parses `app/layout.tsx`
- **THEN** `<html>` MUST carry `className="dark"` from the very first paint
- **AND** the body MUST render with `background-color: zinc-950` (Tailwind class `bg-zinc-950` on `<body>` or equivalent root)
- **AND** no FOUC (flash of unstyled / light content) MUST be observable.

#### Scenario: Tailwind directives loaded
- **WHEN** `app/globals.css` is processed by PostCSS
- **THEN** it MUST contain the v3 directives `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` in that order
- **AND** it MUST NOT contain `@import "tailwindcss"` (v4 syntax).

### Requirement: REQ-UI-13: Palette Tokens (WCAG AA floor)
The `bunker-ui` surface MUST apply a fixed palette with documented contrast ratios.

#### Scenario: Primary accent on base
- **WHEN** any safety / positive-emphasis text or border is rendered
- **THEN** it MUST use Tailwind class `text-fuchsia-500` or `border-fuchsia-500` or `bg-fuchsia-500`
- **AND** the contrast against `zinc-950` MUST be at least 4.5:1 (WCAG AA, measured ≥6.3:1 for fuchsia-500).

#### Scenario: Complementary accent on base (reserved for future FRs)
- **GIVEN** the FR-3 implementation is deployed
- **WHEN** the implementation is reviewed
- **THEN** `pink-400` is RESERVED in the design token table as the complementary attention accent (contrast ≥7.8:1 AAA on zinc-950)
- **AND** its first concrete use in production code is deferred to a follow-up FR that introduces a feature requiring attention accent (e.g. warning/alert states, prominent CTAs)
- **AND** the absence of `pink-400` in the FR-3 source MUST NOT be treated as a defect — the token is intentionally unused at this stage.

#### Scenario: Body text floor
- **WHEN** any body or label text is rendered against `zinc-950`
- **THEN** it MUST use at least `text-zinc-400` (NOT `text-zinc-500`, which fails AA).

### Requirement: REQ-UI-14: Typography Scale
The `bunker-ui` surface MUST use a sans-serif for labels and `font-mono` for numeric values.

#### Scenario: Numeric values are mono with tabular figures
- **WHEN** any monetary amount or numeric data is rendered (in `BunkerHero`, `MacroGrid`, `AuditSplit`)
- **THEN** the parent element MUST carry `font-mono`
- **AND** the parent element MUST carry `tabular-nums` Tailwind utility to prevent jitter on value changes.

#### Scenario: Labels are sans
- **WHEN** any descriptive label is rendered
- **THEN** it MUST use the default sans-serif stack (Tailwind default, no `font-mono`).

### Requirement: REQ-UI-15: Semantic Spacing + Industrial Borders
The `bunker-ui` surface MUST apply consistent spacing and industrial borders.

#### Scenario: Borders
- **WHEN** any card, panel, or section divider is rendered
- **THEN** it MUST use `border-zinc-800` (1px hairline border consistent with cyber-dashboard aesthetic).

#### Scenario: Spacing scale
- **WHEN** any element is rendered
- **THEN** padding and margins MUST use Tailwind's standard spacing scale (`p-*`, `m-*`, `gap-*`) at multiples of 4px (e.g. `p-4`, `p-6`, `gap-4`).

### Requirement: REQ-UI-16: Zero-Motion Contract
The `bunker-ui` surface MUST NOT introduce any motion, transition, or animation.

#### Scenario: No transition or animation utilities
- **WHEN** the implementation is reviewed
- **THEN** no `transition-*`, `animate-*`, `duration-*`, `ease-*`, `motion-*` Tailwind classes MUST appear in any component or `globals.css`.

#### Scenario: prefers-reduced-motion is moot
- **WHEN** the implementation is reviewed
- **THEN** no CSS `@media (prefers-reduced-motion: ...)` block is required (because no motion exists to reduce).

### Requirement: REQ-UI-17: MacroGrid Semantic Color Mapping
The `MacroGrid` component MUST map amount sign to color using an inline CSS rule, without mutating `frozenContracts.ts`.

#### Scenario: Positive amounts
- **WHEN** `MacroGrid` renders a card with a positive amount
- **THEN** the numeric value MUST be rendered with `text-emerald-400`.

#### Scenario: Negative amounts
- **WHEN** `MacroGrid` renders a card with a negative amount
- **THEN** the numeric value MUST be rendered with `text-red-400` (or `text-rose-400`).

#### Scenario: Warning / alert thresholds (deferred)
- **GIVEN** the FR-3 implementation is deployed
- **WHEN** the implementation is reviewed
- **THEN** the `amountColorClass` helper in `MacroGrid.tsx` MUST be implemented as `function amountColorClass(amount: number): string` (single-argument sign-based mapping only)
- **AND** the warning/alert threshold branches (`text-fuchsia-500` for warning, `text-pink-400` for alert) are DEFERRED to a follow-up FR that exposes a `threshold?: 'warning' | 'alert'` field on the `BunkerFixtures` aggregate
- **AND** when that follow-up FR ships, the helper MUST be updated to `amountColorClass(amount: number, threshold?: 'warning' | 'alert'): string` to satisfy this scenario.

#### Scenario: No view-model mutation
- **WHEN** the implementation is reviewed
- **THEN** `src/sandbox-bridge/frozenContracts.ts` MUST be byte-identical to the FR-2-archived version
- **AND** no `tone` or color prop MAY be added to `BunkerFixtures` or any `BunkerHero` / `MacroGrid` / `AuditSplit` / `BunkerHeader` prop type.

#### Scenario: Inline CSS rule location
- **WHEN** the implementation is reviewed
- **THEN** the sign-to-color mapping rule MUST live in `MacroGrid.tsx` (either as a local `className` switch or as a `<style jsx>` block or as a co-located helper function).

#### Scenario: Helper signature is single-argument in FR-3
- **WHEN** the FR-3 implementation is reviewed
- **THEN** the `amountColorClass` helper in `MacroGrid.tsx` MUST be defined as `function amountColorClass(amount: number): string` (no `threshold` parameter)
- **AND** the return values MUST be:
  - `amount > 0` → `text-emerald-400`
  - `amount < 0` → `text-red-400`
  - `amount === 0` → `text-zinc-400`.

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
- See also `fr3-ui-styling` archive: REQ-UI-5 SUPERSEDED 2026-07-20; styling contract moved to REQ-UI-12..17.