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

export function MacroGrid({ cards }: MacroGridProps): ReactNode {
  return (
    <table>
      <tbody>
        <tr>
          {cards.map((card) => (
            <td key={card.label}>
              <h3>{card.label}</h3>
              <div>{card.value}</div>
              <small>{card.trend}</small>
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
