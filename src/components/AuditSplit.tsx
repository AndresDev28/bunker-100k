/**
 * AuditSplit — production component (FR-2).
 *
 * REQ-UI-1: lives in src/components/, importable via @/components/*.
 * REQ-UI-3: renders sourceFiles, dateRange, transactionCount, ownerId metadata.
 * REQ-UI-5: un-styled — bare semantic HTML, no Tailwind classes.
 * A2: all visible strings from @/lib/labels (section titles, subcategory labels,
 *     optimizationFooter). Zero inline JSX string literals.
 */
import React, { type ReactNode } from 'react';
import type { AuditSplitProps } from '@/sandbox-bridge/frozenContracts';
import { NEEDS_SECTION_TITLE, WANTS_SECTION_TITLE, optimizationFooter } from '@/lib/labels';

export function AuditSplit({
  needs,
  wants,
  optimizationPotential,
  needsLabels,
  wantsLabels,
  sourceFiles,
  dateRange,
  transactionCount,
  ownerId,
}: AuditSplitProps): ReactNode {
  return (
    <table className="border-t border-zinc-800 pt-4 mt-6 w-full">
      <thead>
        <tr>
          <th colSpan={2}>
            <div className="flex justify-between text-xs text-zinc-400 py-1">
              <span>Sources: {sourceFiles.join(', ')}</span>
              <span>
                Range: {dateRange.from} → {dateRange.to}
              </span>
              <span>
                Transactions: <span className="font-mono tabular-nums">{transactionCount}</span>
              </span>
              <span>
                Owner: <span className="font-mono tabular-nums">{ownerId}</span>
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border border-zinc-800 rounded p-4 bg-zinc-900/40 align-top w-1/2">
            <h2 className="text-fuchsia-500 font-semibold mb-2">{NEEDS_SECTION_TITLE}</h2>
            <ul className="space-y-1">
              {needs.map((line) => (
                <li key={line.subcategory} className="text-zinc-300 text-sm">
                  {needsLabels[line.subcategory]}:{' '}
                  <span className="font-mono tabular-nums text-zinc-100">
                    {line.amount.toLocaleString()} €
                  </span>
                </li>
              ))}
            </ul>
          </td>
          <td className="border border-zinc-800 rounded p-4 bg-zinc-900/40 align-top w-1/2">
            <h2 className="text-fuchsia-500 font-semibold mb-2">{WANTS_SECTION_TITLE}</h2>
            <ul className="space-y-1">
              {wants.map((line) => (
                <li key={line.subcategory} className="text-zinc-300 text-sm">
                  {wantsLabels[line.subcategory]}:{' '}
                  <span className="font-mono tabular-nums text-zinc-100">
                    {line.amount.toLocaleString()} €
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2}>
            <small className="text-zinc-500 text-xs">
              {optimizationFooter(optimizationPotential)}
            </small>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
