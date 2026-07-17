import { describe, it, expect } from 'vitest';
import { classify } from '@/lib/engine/classify';
import type { CategoryTier } from '@/lib/types/category';

describe('T-3 fallback classification', () => {
  // REQ-DEDUP-4: sign-based stub — negative → wants.variables, positive → income.salary
  // This stub is the FR-2 swap boundary: FR-2 replaces the body, not the signature.

  it('classifies negative amount as wants.variables (fallback)', () => {
    const result = classify(-12.5);
    expect(result.tier).toBe('wants');
    expect(result.subcategory).toBe('variables');
  });

  it('classifies positive amount as income.salary', () => {
    const result = classify(2500);
    expect(result.tier).toBe('income');
    expect(result.subcategory).toBe('salary');
  });

  it('classifies zero as wants.variables (zero treated as outflow / fallback)', () => {
    // Zero has no sign — by convention treated as a non-income. The fallback
    // routes it to wants.variables so FR-2 keyword-matcher can override it.
    const result = classify(0);
    expect(result.tier).toBe('wants');
    expect(result.subcategory).toBe('variables');
  });

  it('classifies very large negative amount as wants.variables', () => {
    const result = classify(-1_000_000);
    expect(result.tier).toBe('wants');
    expect(result.subcategory).toBe('variables');
  });

  it('returns a CategoryRef with tier of type CategoryTier', () => {
    const result = classify(1000);
    const tiers: CategoryTier[] = ['income', 'needs', 'wants'];
    expect(tiers).toContain(result.tier);
    expect(typeof result.subcategory).toBe('string');
  });
});
