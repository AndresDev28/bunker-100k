import { describe, it, expect } from 'vitest';
import { computeBunkerTarget } from '@/lib/engine/computeBunkerTarget';

describe('T-2 Wants isolation in Bunker Target', () => {
  // REQ-DEDUP-5 + spec §4 block 2: Bt = SurvivalMonthlyCost * 6 (Wants strictly isolated).
  // The wantsTotal param is visible in the signature — it MUST be ignored in FR-1.

  it('computeBunkerTarget(1400, 600) returns 8400 — NOT 12000 (Wants-isolation gate)', () => {
    const result = computeBunkerTarget(1400, 600);
    expect(result).toBe(8400);
    expect(result).not.toBe(12000);
  });

  it('computeBunkerTarget(1400, 0) returns 8400 — zero wants also ignored', () => {
    expect(computeBunkerTarget(1400, 0)).toBe(8400);
  });

  it('computeBunkerTarget(1400, 1_000_000) returns 8400 — absurd wants still ignored', () => {
    expect(computeBunkerTarget(1400, 1_000_000)).toBe(8400);
  });

  it('computeBunkerTarget(0, 600) returns 0 — zero cost is zero target', () => {
    expect(computeBunkerTarget(0, 600)).toBe(0);
  });

  it('computeBunkerTarget(2000, 800) returns 12000 — needs-only formula', () => {
    expect(computeBunkerTarget(2000, 800)).toBe(12000);
  });
});
