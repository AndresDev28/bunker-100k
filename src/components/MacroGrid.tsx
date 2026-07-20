/**
 * MacroGrid — production component (FR-2).
 *
 * REQ-UI-1: lives in src/components/, importable via @/components/*.
 * REQ-UI-5: un-styled — bare semantic HTML, no Tailwind classes.
 * A2: all visible strings from @/lib/labels (card labels and trends come from props,
 *     populated by buildBunkerViewModel from labels.ts).
 */
import React, { type ReactNode } from 'react';
import type { MacroGridProps } from '@/sandbox-bridge/frozenContracts';

/** Co-located helper — lives in MacroGrid.tsx only, not exported. */
function amountColorClass(amount: number): string {
  if (amount > 0) return 'text-emerald-400';
  if (amount < 0) return 'text-red-400';
  return 'text-zinc-400';
}

export function MacroGrid({ cards }: MacroGridProps): ReactNode {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const numericValue = typeof card.value === 'number' ? card.value : 0;
        return (
          <div key={card.label} className="border border-zinc-800 rounded p-4 bg-zinc-900/40">
            <h3 className="text-zinc-400 text-sm mb-1">{card.label}</h3>
            <div
              className={`font-mono tabular-nums text-2xl font-semibold ${amountColorClass(numericValue)}`}
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
