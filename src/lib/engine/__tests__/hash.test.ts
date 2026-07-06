import { describe, it, expect } from 'vitest';
import { hashTransaction } from '@/lib/engine/hash';
import { cleanDescription } from '@/lib/engine/cleanDescription';

/**
 * T-1 SHA-256 idempotency — hash builds on W1 (cleanDescription).
 *
 * Test structure:
 * - Uses cleanDescription (W1) as the normalizer for description
 * - Inlines date normalization to ISODate strings (parseDate lands in W5)
 * - Verifies identical normalized triples → identical hash (idempotency)
 * - Verifies different triples → different hash (collision resistance)
 * - Verifies cross-format fixture: same logical date via different input strings
 *
 * REQ-DEDUP-1: identical {date, cleanedDescription, amount} → identical id
 */

const normalizeDate = (raw: string, _fmt?: string): string => {
  // Inline stub for W2 — parseDate properly lands in W5
  // Accepts DD/MM/YYYY or YYYY-MM-DD and returns YYYY-MM-DD
  if (raw.includes('/')) {
    const [d, m, y] = raw.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return raw; // already YYYY-MM-DD
};

describe('T-1 SHA-256 hash idempotency', () => {
  it('identical normalized triple produces identical hash (idempotency)', () => {
    const date = '2026-03-01';
    const cleanedDesc = cleanDescription('GLOVO   *order # 123 ');
    const amount = -12.5;

    const hash1 = hashTransaction({ date, cleanedDescription: cleanedDesc, amount });
    const hash2 = hashTransaction({ date, cleanedDescription: cleanedDesc, amount });

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
  });

  it('different date (even by one day) produces different hash', () => {
    const cleanedDesc = cleanDescription('GLOVO *Order#123');
    const amount = -12.5;

    const hash1 = hashTransaction({ date: '2026-03-01', cleanedDescription: cleanedDesc, amount });
    const hash2 = hashTransaction({ date: '2026-03-02', cleanedDescription: cleanedDesc, amount });

    expect(hash1).not.toBe(hash2);
  });

  it('different cleanedDescription (post-normalization) produces different hash', () => {
    const date = '2026-03-01';
    const amount = -12.5;

    const hash1 = hashTransaction({ date, cleanedDescription: 'amazon marketplace', amount });
    const hash2 = hashTransaction({ date, cleanedDescription: 'amazon market place', amount });

    expect(hash1).not.toBe(hash2);
  });

  it('different amount produces different hash', () => {
    const date = '2026-03-01';
    const cleanedDesc = cleanDescription('GLOVO *Order#123');

    const hash1 = hashTransaction({ date, cleanedDescription: cleanedDesc, amount: -12.5 });
    const hash2 = hashTransaction({ date, cleanedDescription: cleanedDesc, amount: -12.6 });

    expect(hash1).not.toBe(hash2);
  });

  it('cross-format: same logical date from DD/MM/YYYY and YYYY-MM-DD produces identical hash', () => {
    const desc = 'GLOVO   *order # 123 ';
    const amount = -12.5;

    // Two different input formats for the same logical date
    const dateA = normalizeDate('01/03/2026', 'DD/MM/YYYY');
    const dateB = normalizeDate('2026-03-01', 'YYYY-MM-DD');

    const hashA = hashTransaction({ date: dateA, cleanedDescription: cleanDescription(desc), amount });
    const hashB = hashTransaction({ date: dateB, cleanedDescription: cleanDescription(desc), amount });

    expect(dateA).toBe(dateB); // normalizeDate produces same ISODate
    expect(hashA).toBe(hashB); // same ISODate → same hash
  });

  it('same input twice: hash is stable (determinism property)', () => {
    const input = { date: '2026-03-01', cleanedDescription: cleanDescription('GLOVO *Order#123'), amount: -12.5 };

    const hash1 = hashTransaction(input);
    const hash2 = hashTransaction(input);

    expect(hash1).toBe(hash2);
  });
});
