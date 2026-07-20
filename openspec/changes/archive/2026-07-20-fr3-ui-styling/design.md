# Design: fr3-ui-styling

## Technical Approach

Wire the existing Tailwind v3 setup into the FR-2 production surfaces: create `app/globals.css`, import it from the App Router root, force the `dark` class on `<html>`, and add utilities to the four semantic components. The implementation is styling-only: frozen props, labels, aggregate math, actions, and sandbox remain unchanged. Strict-TDD keeps `vitest run`, `tsc --noEmit`, `eslint .`, and `prettier --check .` green; `next build` is added at verify to validate content scanning.

## Architecture

### Entry points (D1–D3)

- **D1 — Bootstrap CSS**: create `app/globals.css` containing, in order, `@tailwind base;`, `@tailwind components;`, and `@tailwind utilities;`. Do not use Tailwind v4 `@import "tailwindcss"`.
- **D2 — Root dark class**: `app/layout.tsx` imports `./globals.css` and renders `<html className="dark" lang="en">`. The body receives `bg-zinc-950 text-zinc-100`, preventing first-paint light-mode flash.
- **D3 — Existing config**: retain `tailwind.config.ts` content globs (`./app/**`, `./src/**`), `darkMode: 'class'`, and empty `theme.extend`; retain the existing PostCSS plugin wiring. No token customization is needed for FR-3.

### Token table (D4–D6)

| Role | Utility | Use |
|---|---|---|
| Base | `bg-zinc-950` | Root background |
| Primary safety | `text-fuchsia-500`, `border-fuchsia-500`, `bg-fuchsia-500` | Brand/positive emphasis; 6.3:1 AA |
| Attention | `text-pink-400`, `border-pink-400`, `bg-pink-400` | Attention emphasis; 7.8:1 AAA |
| Body floor | `text-zinc-400` | Labels/prose; zinc-500 is below AA |
| Positive/negative | `text-emerald-400`, `text-red-400` (or `text-rose-400`) | Macro amounts |
| Hairline | `border-zinc-800` | Cards, panels, dividers |

Labels use Tailwind’s default sans stack. Monetary and numeric values use `font-mono tabular-nums`. Spacing uses the standard 4px utilities (`p-4`, `p-6`, `gap-4`); no custom CSS or spacing extensions are introduced.

### MacroGrid semantic mapping (D7)

Keep the rule co-located in `src/components/MacroGrid.tsx`; do not add a `tone` field or prop. The helper applies threshold precedence when documented threshold data is available, then sign mapping:

```tsx
function amountColorClass(amount: number, threshold?: 'warning' | 'alert'): string {
  if (threshold === 'alert') return 'text-pink-400';
  if (threshold === 'warning') return 'text-fuchsia-500';
  if (amount > 0) return 'text-emerald-400';
  if (amount < 0) return 'text-red-400';
  return 'text-zinc-400';
}
```

The current frozen `MacroGridProps` has no threshold metadata, so the FR-3 path uses numeric sign without changing the view-model. String card values remain neutral unless safely normalized as numeric presentation data.

### Frozen guards (D8)

`src/sandbox-bridge/frozenContracts.ts`, all four prop interfaces, and `BunkerFixtures` remain byte-identical. No aggregate, labels, page composition, action, or sandbox changes are in scope. REQ-UI-5 is superseded only through the delta/archive workflow, never edited in the FR-2 archived copy.

## Data Flow

`app/layout.tsx` → `globals.css`/Tailwind → `app/page.tsx` → frozen fixtures → component-local class mapping → rendered dark UI. Styling consumes existing values only; no data returns to the aggregate.

## File Changes

| File | Action | Description |
|---|---|---|
| `app/globals.css` | Create | Tailwind v3 directives only. |
| `app/layout.tsx` | Modify | Import global CSS; stamp dark root and body tokens. |
| `src/components/BunkerHeader.tsx` | Modify | Header layout, padding, divider, fuchsia title. |
| `src/components/BunkerHero.tsx` | Modify | Numeric typography, labels, dark panel/progress styling. |
| `src/components/MacroGrid.tsx` | Modify | Responsive cards, borders, spacing, local amount colors. |
| `src/components/AuditSplit.tsx` | Modify | Responsive split, borders, spacing, numeric metadata styling. |

## Interfaces / Contracts

No public interface changes. `MacroGrid` continues to consume `MacroGridProps`; color state is presentation-only and local to the component.

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit/render | Existing labels, zero-state, prop contracts | Existing `renderToStaticMarkup`/`toContain` Vitest net; class additions preserve visible text. |
| Static/build | Tailwind directives and class scanning | `next build`; inspect generated build success and reject v4 syntax/unknown utilities. |
| Gates | Type, lint, formatting | `vitest run`, `tsc --noEmit`, `eslint .`, `prettier --check .`. |

No new tests are required for this styling pass.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is changed.

## Migration / Rollout

No migration required. Ship as one dark-only styling change; no feature flag, toggle, storage, animation, or rollout phase.

## Open Questions

None. Product locks P1–P5 and proposal decisions A1–A7 are resolved.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines (authored) | ~150–250 |
| Forecast verdict | Single PR (`feat/fr3-ui-styling`) |
| Review budget | 400 lines; low risk |
| Decision needed before apply | No |
| Chained PRs recommended | No |
| Chain strategy | n/a |

## Next phase

`/sdd-continue fr3-ui-styling` → tasks.
