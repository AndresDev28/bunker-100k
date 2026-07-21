/**
 * deriveThreshold — pure predicate (REQ-AGG-6, FR-4).
 *
 * Computes `BunkerFixtures.threshold` from `(currentCash, bunkerTarget)`.
 * No I/O, no Date.now, no mutation — REQ-AGG-1 / REQ-AGG-5 hold.
 *
 * Band rules:
 *   'alert'   ← |currentCash| < 5% × bunkerTarget
 *   'warning' ← 5% × bunkerTarget ≤ |currentCash| < 20% × bunkerTarget
 *   undefined ← otherwise (healthy) OR bunkerTarget ≤ 0 (zero-state)
 */

export type Threshold = 'warning' | 'alert';

/** Lower band cut (alert < x ≤ warning). */
const ALERT_CUT = 0.05;

/** Upper band cut (warning < x ≤ healthy). */
const WARNING_CUT = 0.2;

export function deriveThreshold(currentCash: number, bunkerTarget: number): Threshold | undefined {
  // Zero-state safety (REQ-AGG-5): no stable denominator → undefined, no NaN.
  if (bunkerTarget <= 0) return undefined;

  const ratio = Math.abs(currentCash) / bunkerTarget;

  if (ratio < ALERT_CUT) return 'alert';
  if (ratio < WARNING_CUT) return 'warning';
  return undefined;
}
