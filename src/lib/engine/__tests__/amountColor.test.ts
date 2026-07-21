/**
 * amountColorClass — pure helper (REQ-UI-17, FR-4).
 *
 * Lives in src/lib/engine/amountColor.ts (extracted from MacroGrid).
 * Signature: amountColorClass(amount, threshold?) → Tailwind class string.
 *
 * Return matrix:
 *   threshold === 'alert'   → 'text-pink-400'
 *   threshold === 'warning' → 'text-fuchsia-500'
 *   amount > 0              → 'text-emerald-400'
 *   amount < 0              → 'text-red-400'
 *   amount === 0            → 'text-zinc-400'
 *
 * Threshold branches win over sign branches (REQ-UI-17 scenario
 * "Threshold overrides sign mapping").
 */
import { describe, it, expect } from 'vitest';
import { amountColorClass } from '../amountColor';

describe('amountColorClass (REQ-UI-17) — sign branches (no threshold)', () => {
  it('positive amount returns text-emerald-400', () => {
    expect(amountColorClass(100)).toBe('text-emerald-400');
  });

  it('negative amount returns text-red-400', () => {
    expect(amountColorClass(-50)).toBe('text-red-400');
  });

  it('zero amount returns text-zinc-400', () => {
    expect(amountColorClass(0)).toBe('text-zinc-400');
  });
});

describe('amountColorClass (REQ-UI-17) — threshold branches', () => {
  it('threshold="warning" returns text-fuchsia-500 regardless of amount sign', () => {
    expect(amountColorClass(100, 'warning')).toBe('text-fuchsia-500');
    expect(amountColorClass(-100, 'warning')).toBe('text-fuchsia-500');
    expect(amountColorClass(0, 'warning')).toBe('text-fuchsia-500');
  });

  it('threshold="alert" returns text-pink-400 regardless of amount sign', () => {
    expect(amountColorClass(100, 'alert')).toBe('text-pink-400');
    expect(amountColorClass(-100, 'alert')).toBe('text-pink-400');
    expect(amountColorClass(0, 'alert')).toBe('text-pink-400');
  });
});

describe('amountColorClass (REQ-UI-17) — threshold overrides sign', () => {
  it('positive amount with threshold="alert" → text-pink-400 (NOT emerald)', () => {
    // Triangulation case: even an unambiguously positive value loses to threshold
    expect(amountColorClass(999_999, 'alert')).toBe('text-pink-400');
  });

  it('negative amount with threshold="warning" → text-fuchsia-500 (NOT red)', () => {
    expect(amountColorClass(-999_999, 'warning')).toBe('text-fuchsia-500');
  });

  it('explicit undefined threshold falls through to sign branches', () => {
    expect(amountColorClass(100, undefined)).toBe('text-emerald-400');
    expect(amountColorClass(-100, undefined)).toBe('text-red-400');
    expect(amountColorClass(0, undefined)).toBe('text-zinc-400');
  });
});
