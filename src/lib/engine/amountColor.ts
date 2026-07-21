/**
 * amountColorClass — pure helper (REQ-UI-17, FR-4).
 *
 * Extracted from MacroGrid.tsx to a shared module so the threshold branches
 * stay unit-testable without rendering. Signature:
 *   amountColorClass(amount: number, threshold?: 'warning' | 'alert'): string
 *
 * Threshold wins over sign (REQ-UI-17 scenario "Threshold overrides sign
 * mapping"). Sign branches retain the FR-3 single-argument behavior for the
 * undefined-threshold case.
 */
import type { Threshold } from './deriveThreshold';

export function amountColorClass(amount: number, threshold?: Threshold): string {
  if (threshold === 'alert') return 'text-pink-400';
  if (threshold === 'warning') return 'text-fuchsia-500';

  if (amount > 0) return 'text-emerald-400';
  if (amount < 0) return 'text-red-400';
  return 'text-zinc-400';
}
