# Delta Spec: fr3-ui-styling — Tailwind styling on FR-2 UI surfaces

## MODIFIED Requirements

### REQ-UI-5: Un-styled Shipment (A5) — SUPERSEDED

> **Status**: SUPERSEDED by fr3-ui-styling. Original wording preserved in `openspec/specs/bunker-ui/spec.md` (FR-2 canonical). The styling contract for these surfaces now lives in REQ-UI-12..17 below. When fr3-ui-styling is archived, the canonical spec MUST replace REQ-UI-5 with a SUPERSEDED marker pointing to REQ-UI-12..17, and the FR-2 archived copy under `openspec/changes/archive/2026-07-18-fr2-ui-replacement/specs/bunker-ui/spec.md` MUST retain the original wording.

#### Scenario: REQ-UI-5 is superseded at archive time

- **GIVEN** the fr3-ui-styling implementation is complete and verified
- **WHEN** the archive phase runs
- **THEN** `openspec/specs/bunker-ui/spec.md` MUST replace REQ-UI-5 with a `> SUPERSEDED by fr3-ui-styling → REQ-UI-12..17` marker
- **AND** the FR-2 archived copy MUST retain the original REQ-UI-5 wording byte-for-byte.

## ADDED Requirements

### REQ-UI-12: Dark-only Root Contract

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

### REQ-UI-13: Palette Tokens (WCAG AA floor)

The `bunker-ui` surface MUST apply a fixed palette with documented contrast ratios.

#### Scenario: Primary accent on base

- **WHEN** any safety / positive-emphasis text or border is rendered
- **THEN** it MUST use Tailwind class `text-fuchsia-500` or `border-fuchsia-500` or `bg-fuchsia-500`
- **AND** the contrast against `zinc-950` MUST be at least 4.5:1 (WCAG AA, measured ≥6.3:1 for fuchsia-500).

#### Scenario: Complementary accent on base

- **WHEN** any attention / decorative text or border is rendered
- **THEN** it MUST use Tailwind class `text-pink-400` or `border-pink-400` or `bg-pink-400`
- **AND** the contrast against `zinc-950` MUST be at least 4.5:1 (WCAG AA, measured ≥7.8:1 for pink-400).

#### Scenario: Body text floor

- **WHEN** any body or label text is rendered against `zinc-950`
- **THEN** it MUST use at least `text-zinc-400` (NOT `text-zinc-500`, which fails AA).

### REQ-UI-14: Typography Scale

The `bunker-ui` surface MUST use a sans-serif for labels and `font-mono` for numeric values.

#### Scenario: Numeric values are mono with tabular figures

- **WHEN** any monetary amount or numeric data is rendered (in `BunkerHero`, `MacroGrid`, `AuditSplit`)
- **THEN** the parent element MUST carry `font-mono`
- **AND** the parent element MUST carry `tabular-nums` Tailwind utility to prevent jitter on value changes.

#### Scenario: Labels are sans

- **WHEN** any descriptive label is rendered
- **THEN** it MUST use the default sans-serif stack (Tailwind default, no `font-mono`).

### REQ-UI-15: Semantic Spacing + Industrial Borders

The `bunker-ui` surface MUST apply consistent spacing and industrial borders.

#### Scenario: Borders

- **WHEN** any card, panel, or section divider is rendered
- **THEN** it MUST use `border-zinc-800` (1px hairline border consistent with cyber-dashboard aesthetic).

#### Scenario: Spacing scale

- **WHEN** any element is rendered
- **THEN** padding and margins MUST use Tailwind's standard spacing scale (`p-*`, `m-*`, `gap-*`) at multiples of 4px (e.g. `p-4`, `p-6`, `gap-4`).

### REQ-UI-16: Zero-Motion Contract

The `bunker-ui` surface MUST NOT introduce any motion, transition, or animation.

#### Scenario: No transition or animation utilities

- **WHEN** the implementation is reviewed
- **THEN** no `transition-*`, `animate-*`, `duration-*`, `ease-*`, `motion-*` Tailwind classes MUST appear in any component or `globals.css`.

#### Scenario: prefers-reduced-motion is moot

- **WHEN** the implementation is reviewed
- **THEN** no CSS `@media (prefers-reduced-motion: ...)` block is required (because no motion exists to reduce).

### REQ-UI-17: MacroGrid Semantic Color Mapping

The `MacroGrid` component MUST map amount sign to color using an inline CSS rule, without mutating `frozenContracts.ts`.

#### Scenario: Positive amounts

- **WHEN** `MacroGrid` renders a card with a positive amount
- **THEN** the numeric value MUST be rendered with `text-emerald-400`.

#### Scenario: Negative amounts

- **WHEN** `MacroGrid` renders a card with a negative amount
- **THEN** the numeric value MUST be rendered with `text-red-400` (or `text-rose-400`).

#### Scenario: Warning / alert thresholds

- **WHEN** `MacroGrid` renders a card whose amount crosses a documented warning or alert threshold (defined in the view-model aggregate `buildBunkerViewModel` or documented inline in the component if not in the aggregate)
- **THEN** the numeric value MUST be rendered with `text-fuchsia-500` (warning) or `text-pink-400` (alert), per REQ-UI-13.

#### Scenario: No view-model mutation

- **WHEN** the implementation is reviewed
- **THEN** `src/sandbox-bridge/frozenContracts.ts` MUST be byte-identical to the FR-2-archived version
- **AND** no `tone` or color prop MAY be added to `BunkerFixtures` or any `BunkerHero` / `MacroGrid` / `AuditSplit` / `BunkerHeader` prop type.

#### Scenario: Inline CSS rule location

- **WHEN** the implementation is reviewed
- **THEN** the sign-to-color mapping rule MUST live in `MacroGrid.tsx` (either as a local `className` switch or as a `<style jsx>` block or as a co-located helper function).

## RENAMED Requirements

None.

## REMOVED Requirements

None.