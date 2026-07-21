# Delta Spec: fr4-threshold-amount-color — Threshold field + amountColorClass upgrade

> **Status**: LIFTS the FR-3 relaxation on REQ-UI-17 — `BunkerFixtures` gains
> `threshold?: 'warning' | 'alert'` (REQ-AGG-6) and the deferred branches become ACTIVE.
> The T8 frozen-guard is INTENTIONALLY REVERSED for this one additive field
> (FR-3 archive `verify-report-official.md:146-148`).

## MODIFIED Requirements

### Requirement: REQ-UI-17: MacroGrid Semantic Color Mapping

The `MacroGrid` component MUST map each card's amount to a semantic color class by
consuming the shared pure helper `amountColorClass(amount, threshold?)` and forwarding
`BunkerFixtures.threshold`.

(Previously: sign-only mapping inline in `MacroGrid.tsx`; threshold branches deferred;
`frozenContracts.ts` untouchable.)

#### Scenario: Positive amounts

- **GIVEN** a card whose numeric value is `> 0` and `threshold` is `undefined`
- **WHEN** `MacroGrid` renders the card
- **THEN** the numeric value MUST carry `text-emerald-400`

#### Scenario: Negative amounts

- **GIVEN** a card whose numeric value is `< 0` and `threshold` is `undefined`
- **WHEN** `MacroGrid` renders the card
- **THEN** the numeric value MUST carry `text-red-400` (or `text-rose-400`)

#### Scenario: Warning threshold active

- **GIVEN** `BunkerFixtures.threshold === 'warning'`
- **WHEN** `MacroGrid` renders any card
- **THEN** the numeric value MUST carry `text-fuchsia-500`

#### Scenario: Alert threshold active

- **GIVEN** `BunkerFixtures.threshold === 'alert'`
- **WHEN** `MacroGrid` renders any card
- **THEN** the numeric value MUST carry `text-pink-400`
- **AND** this is the first production use of the reserved `pink-400` token (REQ-UI-13)

#### Scenario: Threshold overrides sign mapping

- **GIVEN** a defined `threshold` and an amount of any sign (including `0`)
- **WHEN** the color class is resolved
- **THEN** the threshold branch MUST win over the sign branches

#### Scenario: Scoped contract extension (T8 reversal)

- **WHEN** the implementation is reviewed
- **THEN** `src/sandbox-bridge/frozenContracts.ts` MAY differ from the FR-3-archived byte
  state ONLY by the additive `threshold?: 'warning' | 'alert'` field on `BunkerFixtures`
- **AND** no other contract drift is permitted — no `tone`/color prop on `MacroGridProps`,
  `BunkerHeroProps`, `AuditSplitProps`, or `BunkerHeaderProps`

(Previously: scenario "No view-model mutation" required byte-identical frozenContracts.)

#### Scenario: Helper module location

- **WHEN** the implementation is reviewed
- **THEN** the sign/threshold→color mapping MUST live in one shared pure module
  (`src/lib/engine/amountColor.ts`)
- **AND** `MacroGrid.tsx` MUST import it; no local switch, `<style jsx>`, or co-located
  reimplementation of the mapping MAY remain

(Previously: scenario "Inline CSS rule location" required the rule inside `MacroGrid.tsx`.)

#### Scenario: Helper signature and return matrix

- **WHEN** the exported helper is reviewed
- **THEN** its signature MUST be
  `amountColorClass(amount: number, threshold?: 'warning' | 'alert'): string`
- **AND** the return matrix MUST be: `'alert'` → `text-pink-400`; `'warning'` →
  `text-fuchsia-500`; otherwise `amount > 0` → `text-emerald-400`, `amount < 0` →
  `text-red-400`, `amount === 0` → `text-zinc-400`

(Previously: scenario "Helper signature is single-argument in FR-3" — 3 sign-only branches.)

### Requirement: REQ-UI-13: Palette Tokens (WCAG AA floor)

The `bunker-ui` surface MUST apply a fixed palette with documented contrast ratios.

(Previously: Scenario 2 reserved `pink-400` for a follow-up warning/alert FR; FR-4 is
that follow-up, so the reservation is consumed.)

#### Scenario: Primary accent on base

- **WHEN** any safety / positive-emphasis text or border is rendered
- **THEN** it MUST use Tailwind class `text-fuchsia-500` or `border-fuchsia-500` or `bg-fuchsia-500`
- **AND** the contrast against `zinc-950` MUST be at least 4.5:1 (WCAG AA, measured ≥6.3:1 for fuchsia-500).

#### Scenario: Complementary accent on base (reservation consumed)

- **GIVEN** the FR-4 implementation is deployed
- **WHEN** the implementation is reviewed
- **THEN** the `pink-400` reservation is CONSUMED: its first concrete production use is
  the alert branch of `amountColorClass` (REQ-UI-17)
- **AND** the presence of `pink-400` in production source MUST NOT be treated as a defect

#### Scenario: Body text floor

- **WHEN** any body or label text is rendered against `zinc-950`
- **THEN** it MUST use at least `text-zinc-400` (NOT `text-zinc-500`, which fails AA).

## Strict-TDD Test Blocks (cross-ref spec §4)

- `describe('amountColorClass')` — all five return paths plus threshold-over-sign precedence
- `describe('MacroGrid threshold wiring')` — `'warning' | 'alert' | undefined` renders the matching class
