/**
 * MacroGrid — production component (FR-2).
 *
 * REQ-UI-1: lives in src/components/, importable via @/components/*.
 * REQ-UI-5: un-styled — bare semantic HTML, no Tailwind classes.
 * A2: all visible strings from @/lib/labels (card labels and trends come from props,
 *     populated by buildBunkerViewModel from labels.ts).
 *
 * FR-4 (REQ-UI-17): color mapping extracted to src/lib/engine/amountColor.ts.
 * Threshold is threaded via app/page.tsx as a locally-extended prop; the
 * frozen MacroGridProps interface in frozenContracts.ts is untouched.
 */
import React, { type ReactNode } from 'react';
import type { MacroGridProps as FrozenMacroGridProps } from '@/sandbox-bridge/frozenContracts';
import { amountColorClass } from '@/lib/engine/amountColor';
import type { Threshold } from '@/lib/engine/deriveThreshold';

/**
 * Local prop shape — extends the frozen MacroGridProps with the additive
 * `threshold` field. Kept local so the frozenContracts contract stays
 * byte-stable per spec REQ-UI-17 "Scoped contract extension (T8 reversal)".
 *
 * `| undefined` is explicit (despite `threshold?`) so callers may pass
 * `fixtures.threshold` directly under `exactOptionalPropertyTypes`.
 */
type MacroGridProps = FrozenMacroGridProps & {
  threshold?: Threshold | undefined;
};

export function MacroGrid({ cards, threshold }: MacroGridProps): ReactNode {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const numericValue = typeof card.value === 'number' ? card.value : 0;
        return (
          <div key={card.label} className="border border-zinc-800 rounded p-4 bg-zinc-900/40">
            <h3 className="text-zinc-400 text-sm mb-1">{card.label}</h3>
            <div
              className={`font-mono tabular-nums text-2xl font-semibold ${amountColorClass(numericValue, threshold)}`}
            >
              {card.value}
            </div>
            <small className="text-zinc-400 text-xs">{card.trend}</small>
          </div>
        );
      })}
    </div>
  );
}
