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
    <table>
      <thead>
        <tr>
          <th colSpan={2}>
            <small>
              Sources: {sourceFiles.join(', ')} | Range: {dateRange.from} → {dateRange.to} |
              Transactions: {transactionCount} | Owner: {ownerId}
            </small>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <h2>{NEEDS_SECTION_TITLE}</h2>
            <ul>
              {needs.map((line) => (
                <li key={line.subcategory}>
                  {needsLabels[line.subcategory]}: {line.amount.toLocaleString()} €
                </li>
              ))}
            </ul>
          </td>
          <td>
            <h2>{WANTS_SECTION_TITLE}</h2>
            <ul>
              {wants.map((line) => (
                <li key={line.subcategory}>
                  {wantsLabels[line.subcategory]}: {line.amount.toLocaleString()} €
                </li>
              ))}
            </ul>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2}>
            <small>{optimizationFooter(optimizationPotential)}</small>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
