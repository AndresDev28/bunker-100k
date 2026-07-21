/**
 * deriveThreshold — pure predicate (REQ-AGG-6, FR-4).
 *
 * Returns:
 *   'alert'   ← |currentCash| < 5% × bunkerTarget
 *   'warning' ← 5% × bunkerTarget ≤ |currentCash| < 20% × bunkerTarget
 *   undefined ← otherwise (healthy) OR bunkerTarget ≤ 0 (zero-state, REQ-AGG-5)
 *
 * Purity (REQ-AGG-1): no Date.now, no I/O, no mutation, deterministic.
 */
import { describe, it, expect, vi } from 'vitest';
import { deriveThreshold } from '../deriveThreshold';

describe('deriveThreshold (REQ-AGG-6) — band rules', () => {
  it('maps |currentCash| < 5% of bunkerTarget to "alert"', () => {
    // target=6000, 5%=300, currentCash=100 → alert
    expect(deriveThreshold(100, 6000)).toBe('alert');
  });

  it('maps the [5%, 20%) band to "warning"', () => {
    // target=6000, 10% (600) and 15% (900) → warning
    expect(deriveThreshold(600, 6000)).toBe('warning');
    expect(deriveThreshold(900, 6000)).toBe('warning');
  });

  it('maps ≥20% of bunkerTarget to undefined (healthy)', () => {
    // target=6000, 20%=1200 (boundary) → undefined
    // 50% (3000) → undefined
    expect(deriveThreshold(1200, 6000)).toBeUndefined();
    expect(deriveThreshold(3000, 6000)).toBeUndefined();
  });

  it('uses |currentCash| — negative cash lands in the alert band the same as positive', () => {
    // target=6000, currentCash=-100 → |-100|=100 < 300 → alert
    expect(deriveThreshold(-100, 6000)).toBe('alert');
    // negative cash in warning band → warning
    expect(deriveThreshold(-600, 6000)).toBe('warning');
  });

  it('lower boundary — exactly 5% is "warning" (NOT "alert")', () => {
    // target=6000, exactly 5% = 300 → warning
    expect(deriveThreshold(300, 6000)).toBe('warning');
  });

  it('upper boundary — exactly 20% is undefined (NOT "warning")', () => {
    // target=6000, exactly 20% = 1200 → undefined
    expect(deriveThreshold(1200, 6000)).toBeUndefined();
  });

  it('zero-state — bunkerTarget ≤ 0 has no denominator and returns undefined (REQ-AGG-5)', () => {
    expect(deriveThreshold(0, 0)).toBeUndefined();
    expect(deriveThreshold(100, 0)).toBeUndefined();
    expect(deriveThreshold(100, -50)).toBeUndefined();
  });

  it('placeholder-cash wiring — currentCash=0 with target>0 lands in alert', () => {
    // FR-3 pins currentCash=0; with target>0 the predicate must return 'alert'
    // so the warning/healthy bands are reachable only when the placeholder
    // is replaced. The integration test in buildBunkerViewModel.test.ts asserts
    // this property end-to-end.
    expect(deriveThreshold(0, 6000)).toBe('alert');
  });
});

describe('deriveThreshold (REQ-AGG-6) — purity', () => {
  it('is deterministic — identical inputs yield deep-equal output across repeat calls', () => {
    const first = deriveThreshold(600, 6000);
    const second = deriveThreshold(600, 6000);
    const third = deriveThreshold(600, 6000);
    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(first).toBe('warning');
  });

  it('does not call Date.now — pure with respect to the clock (REQ-AGG-1)', () => {
    const spy = vi.spyOn(Date, 'now');
    deriveThreshold(100, 6000);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
