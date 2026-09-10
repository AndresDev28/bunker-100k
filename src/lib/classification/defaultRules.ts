import type { SubcategoryRule } from './subcategoryRules';

/**
 * Seed keyword rules (REQ-CLS-7).
 *
 * ORDER IS PART OF THE CONTRACT (REQ-CLS-3): earlier entries shadow later ones
 * whose keywords are substrings. Append new rules with that in mind — a broad
 * keyword placed near the top will swallow everything below it.
 *
 * Every `subcategory` here must resolve to a frozen contract literal. Note that
 * `'shopping'` is pending the `WantsSubcategory` T8 reversal; until that lands,
 * a MercadoLibre transaction classifies correctly but is not yet surfaced by
 * `buildBunkerViewModel`'s frozen `wantsAmounts` record.
 */
export const DEFAULT_SUBRULES: readonly SubcategoryRule[] = [
  { keyword: 'mercadolibre', tier: 'wants', subcategory: 'shopping' },
  { keyword: 'netflix', tier: 'wants', subcategory: 'subscriptions' },
  { keyword: 'salary', tier: 'income', subcategory: 'salary' },
  { keyword: 'housing', tier: 'needs', subcategory: 'housing' },
  { keyword: 'groceries', tier: 'needs', subcategory: 'groceries' },
  { keyword: 'utilities', tier: 'needs', subcategory: 'utilities' },
  { keyword: 'fuel', tier: 'needs', subcategory: 'liabilities' },
];
