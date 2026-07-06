import { describe, it, expect } from 'vitest';
import { cleanDescription } from '@/lib/engine/cleanDescription';

describe('T-7 cleanDescription determinism', () => {
  // REQ-DEDUP-2: lowercase + whitespace collapse + punctuation strip + merchant-code collapse

  it('case fold: "Glovo *Order#123" and "GLOVO   *order # 123 " produce byte-identical cleaned strings', () => {
    const a = cleanDescription('Glovo *Order#123');
    const b = cleanDescription('GLOVO   *order # 123 ');
    expect(a).toBe(b);
  });

  it('lowercases the input', () => {
    const result = cleanDescription('AMAZON Marketplace');
    expect(result).toBe('amazon marketplace');
  });

  it('collapses internal whitespace runs into a single space', () => {
    const result = cleanDescription('GLOVO   *order # 123 ');
    expect(result).toBe('glovo order 123'); // single space between glovo and order
  });

  it('strips punctuation marks (# and *)', () => {
    const result = cleanDescription('Glovo *Order#123');
    expect(result).not.toContain('*');
    expect(result).not.toContain('#');
  });

  it('strips trailing order IDs (6+ digits)', () => {
    const result = cleanDescription('Glovo *Order#1234567');
    expect(result).not.toContain('1234567');
    // But a short number like a zip should stay
    const withZip = cleanDescription('Amazon marketplace 10115');
    expect(withZip).toContain('10115');
  });

  it('is deterministic: same input twice yields same output', () => {
    const input = 'GLOVO   *order # 123 ';
    const first = cleanDescription(input);
    const second = cleanDescription(input);
    expect(first).toBe(second);
  });

  it('produces identical cleaned strings that would hash identically', () => {
    // This is the cross-cutting T-7+T-1 property: normalization must produce
    // byte-identical inputs for the hash to be deterministic.
    const a = cleanDescription('Glovo *Order#123');
    const b = cleanDescription('GLOVO   *order # 123 ');
    expect(a).toBe(b);
    // The hash input contract is pinned: both must produce identical hash later
  });
});
