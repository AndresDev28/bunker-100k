import { describe, it, expect } from 'vitest';
import { classify } from '@/lib/engine/classify';
import type { CategoryTier } from '@/lib/types/category';

describe('T-3 fallback classification', () => {
  // REQ-CLS-2: sign-fallback — negative → wants.variables, positive → income.salary.
  // FR-2 migrated the signature to classify(description, amount, rules?). These
  // cases use a description that matches no DEFAULT_SUBRULES keyword, so the
  // sign-fallback branch is the one under test.

  it('classifies negative amount as wants.variables (fallback)', () => {
    const result = classify('X', -12.5);
    expect(result.tier).toBe('wants');
    expect(result.subcategory).toBe('variables');
  });

  it('classifies positive amount as income.salary', () => {
    const result = classify('X', 2500);
    expect(result.tier).toBe('income');
    expect(result.subcategory).toBe('salary');
  });

  it('classifies zero as wants.variables (zero treated as outflow / fallback)', () => {
    // Zero has no sign — by convention treated as a non-income. The fallback
    // routes it to wants.variables unless a keyword rule overrides it.
    const result = classify('X', 0);
    expect(result.tier).toBe('wants');
    expect(result.subcategory).toBe('variables');
  });

  it('classifies very large negative amount as wants.variables', () => {
    const result = classify('X', -1_000_000);
    expect(result.tier).toBe('wants');
    expect(result.subcategory).toBe('variables');
  });

  it('returns a CategoryRef with tier of type CategoryTier', () => {
    const result = classify('X', 1000);
    const tiers: CategoryTier[] = ['income', 'needs', 'wants'];
    expect(tiers).toContain(result.tier);
    expect(typeof result.subcategory).toBe('string');
  });
});
