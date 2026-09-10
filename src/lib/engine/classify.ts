import { DEFAULT_SUBRULES } from '@/lib/classification/defaultRules';
import { matchRule, type SubcategoryRule } from '@/lib/classification/subcategoryRules';
import type { CategoryRef } from '@/lib/types/category';

/**
 * FR-2 keyword classification (REQ-CLS-2).
 *
 * Pipeline:
 *   1. A non-blank description is matched against `rules ?? DEFAULT_SUBRULES`.
 *      The first matching rule wins (REQ-CLS-1/3).
 *   2. Otherwise the FR-1 sign-fallback applies: `amount > 0` → income/salary,
 *      `amount <= 0` → wants/variables. Zero has no sign, so by convention it is
 *      treated as an outflow (REQ-DEDUP-4).
 *
 * Passing `rules` explicitly — including `[]` — bypasses `DEFAULT_SUBRULES`
 * entirely (REQ-CLS-6). Pure: no I/O, no clock.
 */
export function classify(
  description: string,
  amount: number,
  rules?: readonly SubcategoryRule[],
): CategoryRef {
  // REQ-CLS-5: a blank description short-circuits straight to the sign-fallback,
  // no match attempt is performed.
  if (description.trim() !== '') {
    const match = matchRule(description, rules ?? DEFAULT_SUBRULES);
    if (match) return { tier: match.tier, subcategory: match.subcategory };
  }

  if (amount > 0) return { tier: 'income', subcategory: 'salary' };
  return { tier: 'wants', subcategory: 'variables' };
}
