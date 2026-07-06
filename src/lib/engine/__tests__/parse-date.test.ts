import { describe, it, expect } from 'vitest';
import { parseDate } from '@/lib/engine/parseDate';

describe('parseDate', () => {
  it('"2026-03-01" with no hint → ISODate "2026-03-01"', () => {
    expect(parseDate('2026-03-01')).toBe('2026-03-01');
  });

  it('"01/03/2026" with hint "DD/MM/YYYY" → "2026-03-01"', () => {
    expect(parseDate('01/03/2026', 'DD/MM/YYYY')).toBe('2026-03-01');
  });

  it('"03/01/2026" with hint "MM/DD/YYYY" → "2026-03-01"', () => {
    expect(parseDate('03/01/2026', 'MM/DD/YYYY')).toBe('2026-03-01');
  });

  it('"01/03/2026" with hint "MM/DD/YYYY" → "2026-01-03" (proves hint matters)', () => {
    expect(parseDate('01/03/2026', 'MM/DD/YYYY')).toBe('2026-01-03');
  });

  it('"2026-3-1" (no leading zero) → "2026-03-01"', () => {
    expect(parseDate('2026-3-1')).toBe('2026-03-01');
  });

  it('throws on garbage input like "not-a-date"', () => {
    expect(() => parseDate('not-a-date')).toThrow();
  });
});
