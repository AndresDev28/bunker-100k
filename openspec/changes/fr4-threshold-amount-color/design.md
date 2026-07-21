# Design: FR-4 — Threshold field + amountColorClass upgrade

## Technical Approach

Extract the inline `amountColorClass` from `MacroGrid.tsx` into a pure shared module, add a pure threshold-derive predicate, wire both through `BunkerFixtures.threshold`, and consume them in `MacroGrid` via the page thread. Maps directly to Approach B (aggregate-level) from the proposal and lifts the FR-3 relaxation on REQ-UI-17.

## Risk Resolutions

**Risk #1 (numerator)**: Confirmed — `currentCash` is the intended numerator. The spec REQ-AGG-6 scenarios use `|currentCash|` against `bunkerTarget` percentages. No spec revision needed.

**Risk #2 (band reachability)**: `currentCash` is pinned `0` in `buildBunkerViewModel`, so warning/healthy bands are unreachable via the public API. Resolution: extract `deriveThreshold` as a **named-export pure function** in `src/lib/engine/deriveThreshold.ts`. Vitest hits it directly with arbitrary `(currentCash, bunkerTarget)` pairs covering all three bands. `buildBunkerViewModel` calls it internally — the view-model integration test asserts `threshold === 'alert'` when `bunkerTarget > 0` (per spec scenario "Aggregate wiring with placeholder cash").

**Risk #3 (pink-400)**: The alert branch returns `'text-pink-400'` as a string literal in `src/lib/engine/amountColor.ts`. Tailwind v3 JIT scans `./src/**/*.{ts,tsx}` — the token is included in the bundle without `globals.css` changes.

**Risk #4 (archive note)**: Flagged for archive phase — out of scope for design.

## Architecture Decisions

| Decision                  | Option A                                   | Option B                                              | Choice          | Rationale                                                                                          |
| ------------------------- | ------------------------------------------ | ----------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------- |
| Predicate module          | Inline in `buildBunkerViewModel`           | Separate `src/lib/engine/deriveThreshold.ts`          | **B**           | Pure named export reachable by Vitest without rendering; closes FR-3 coverage gap                  |
| Color helper location     | Keep in `MacroGrid.tsx`                    | Extract to `src/lib/engine/amountColor.ts`            | **Extract**     | Spec REQ-UI-17 mandates shared pure module; enables direct unit tests                              |
| Threshold threading       | Add to `MacroGridProps` in frozenContracts | Page passes `threshold` prop outside `MacroGridProps` | **Page thread** | Spec constrains frozenContracts change to `BunkerFixtures` only; `MacroGrid` extends props locally |
| `Threshold` type location | Inline union in each module                | Shared type from `deriveThreshold.ts`                 | **Shared**      | Single source of truth; `amountColor.ts` imports the type                                          |

## Data Flow

```
Transaction[] ──→ buildBunkerViewModel ──→ BunkerFixtures.threshold
                        │                         │
                        ├─ deriveThreshold(0, bunkerTarget)
                        │                         │
                        └──→ page.tsx ──→ <MacroGrid threshold={fixtures.threshold}>
                                              │
                                              └─ amountColorClass(value, threshold)
```

## File Changes

| File                                                    | Action | Description                                                                                        |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `src/lib/engine/deriveThreshold.ts`                     | Create | Pure predicate: `deriveThreshold(currentCash, bunkerTarget)` → `'alert' \| 'warning' \| undefined` |
| `src/lib/engine/__tests__/deriveThreshold.test.ts`      | Create | Unit suite: 8 scenarios from REQ-AGG-6 (all bands, boundaries, zero-state, purity)                 |
| `src/lib/engine/amountColor.ts`                         | Create | Pure helper: `amountColorClass(amount, threshold?)` → Tailwind class string                        |
| `src/lib/engine/__tests__/amountColor.test.ts`          | Create | Unit suite: 5 return paths + threshold-over-sign precedence                                        |
| `src/sandbox-bridge/frozenContracts.ts`                 | Modify | Add `threshold?: 'warning' \| 'alert'` to `BunkerFixtures` (T8 reversal)                           |
| `src/lib/engine/buildBunkerViewModel.ts`                | Modify | Import `deriveThreshold`; set `threshold` on returned fixtures                                     |
| `src/lib/engine/__tests__/buildBunkerViewModel.test.ts` | Modify | Add derive-rule integration tests (alert on placeholder cash, zero-state undefined)                |
| `src/components/MacroGrid.tsx`                          | Modify | Remove inline helper; import `amountColorClass`; accept `threshold` prop locally                   |
| `app/page.tsx`                                          | Modify | Thread `threshold={fixtures.threshold}` to `<MacroGrid>`                                           |
| `src/components/__tests__/components.test.ts`           | Modify | Add MacroGrid threshold wiring tests                                                               |

## Interfaces / Contracts

```typescript
// src/lib/engine/deriveThreshold.ts
export type Threshold = 'warning' | 'alert';
export function deriveThreshold(currentCash: number, bunkerTarget: number): Threshold | undefined;

// src/lib/engine/amountColor.ts
import type { Threshold } from './deriveThreshold';
export function amountColorClass(amount: number, threshold?: Threshold): string;
```

Return matrix: `'alert'` → `text-pink-400`; `'warning'` → `text-fuchsia-500`; else `amount > 0` → `text-emerald-400`, `< 0` → `text-red-400`, `=== 0` → `text-zinc-400`.

## Testing Strategy

| Layer       | What                                            | Approach                                                |
| ----------- | ----------------------------------------------- | ------------------------------------------------------- |
| Unit        | `deriveThreshold` — 8 scenarios (REQ-AGG-6)     | Table-driven Vitest in `deriveThreshold.test.ts`        |
| Unit        | `amountColorClass` — 6 return paths (REQ-UI-17) | Table-driven Vitest in `amountColor.test.ts`            |
| Integration | `buildBunkerViewModel` threshold wiring         | Extend existing test file; assert `fixtures.threshold`  |
| Component   | `MacroGrid` renders correct class per threshold | Extend `components.test.ts`; render with threshold prop |

**Strict TDD order**: RED `deriveThreshold` tests → GREEN impl → RED `amountColorClass` tests → GREEN impl → RED view-model tests → GREEN wiring → RED component tests → GREEN MacroGrid + page.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Single PR (~150-200 authored lines, well under 400-line budget). No chained PR needed.

## Open Questions

- [ ] None — all risks resolved. Risk #4 (archive note) is flagged for the archive phase.
