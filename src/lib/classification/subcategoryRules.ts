import { cleanDescription } from '@/lib/engine/cleanDescription';
import type { CategoryTier } from '@/lib/types/category';

/**
 * A single keyword → category mapping (REQ-CLS-1).
 *
 * `subcategory` is intentionally `string`: it MUST resolve to a frozen
 * `NeedsSubcategory | WantsSubcategory | IncomeSubcategory` literal (REQ-CLS-7),
 * but the frozen unions live in the sandbox-bridge contract and are widened
 * additively per FR, so the type stays open here and the seed list is the
 * enforcement point.
 */
export type SubcategoryRule = {
  /** Matched case-insensitively against the normalized description */
  keyword: string;
  tier: CategoryTier;
  subcategory: string;
};

/**
 * NFKD-decompose and drop the combining diacritical marks.
 *
 * `cleanDescription` NFKD-normalizes but then maps every non-`\w` codepoint to a
 * space — which turns a combining acute into a word break ("mercadolíbre" would
 * become "mercadoli bre") instead of folding it away. REQ-CLS-4 requires the
 * diacritic to disappear, so we fold BEFORE handing the string to the shared
 * normalizer. This is a pre-pass, not a parallel normalizer: every other rule
 * (lowercase, punctuation, whitespace collapse, merchant-code strip) still comes
 * from `cleanDescription`.
 *
 * This deliberately does NOT change `cleanDescription` itself — that function
 * feeds the transaction hash (dedup key), so altering it would invalidate every
 * persisted transaction id.
 */
function foldDiacritics(input: string): string {
  return input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

/** Shared normalization for both sides of the substring comparison (REQ-CLS-4). */
function normalizeForMatch(input: string): string {
  return cleanDescription(foldDiacritics(input));
}

/**
 * Return the FIRST rule whose keyword is a substring of the normalized
 * description, or `null` when nothing matches (REQ-CLS-1, REQ-CLS-3).
 *
 * Pure: no I/O, no clock, no mutation of `rules`.
 */
export function matchRule(
  description: string,
  rules: readonly SubcategoryRule[],
): SubcategoryRule | null {
  const haystack = normalizeForMatch(description);
  if (haystack === '') return null;

  for (const rule of rules) {
    const needle = normalizeForMatch(rule.keyword);
    // An empty keyword would be a substring of everything — treat it as inert
    // rather than a silent catch-all.
    if (needle === '') continue;
    if (haystack.includes(needle)) return rule;
  }

  return null;
}
