import type { CategoryRef } from '@/lib/types/category';

/**
 * FR-1 sign-based classification stub.
 *
 * REQ-DEDUP-4: amount < 0 → wants.variables, amount >= 0 → income.salary.
 *
 * This stub exists so FR-2's keyword matcher can replace the body in a
 * single file — the CategoryRef shape is preserved across the hand-off.
 * The zero-is-wants convention is intentional: zero has no sign, so it
 * falls through to the fallback that FR-2 keyword-matching can override.
 */
export function classify(amount: number): CategoryRef {
  if (amount > 0) return { tier: 'income', subcategory: 'salary' };
  // amount <= 0 falls through: zero has no sign, treated as non-income.
  // FR-2 keyword-matcher can override this fallback for explicit zero cases.
  return { tier: 'wants', subcategory: 'variables' };
}
