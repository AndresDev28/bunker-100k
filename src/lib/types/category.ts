/**
 * Shared category types — FR-1 stub uses sign-based routing;
 * FR-2 replaces the body with keyword matching at the same boundary.
 *
 * REQ-DEDUP-4: classify returns CategoryRef so FR-2 swap is a one-file change.
 */

export type CategoryTier = 'income' | 'needs' | 'wants';

export interface CategoryRef {
  tier: CategoryTier;
  subcategory: string; // FR-1: 'variables' | 'salary' only; FR-2 will expand
}
