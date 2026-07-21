/**
 * FR-1 production canonical contracts — supersedes FR-0 sandbox-local types.
 *
 * Sandbox remains a referenceable visual blueprint. Production owns the typed
 * contract from FR-1 onward. Import from here in production code.
 *
 * W-1 closure: this file re-exports base types from sandbox fixtures and
 * defines the new frozen AuditSplitProps that supersedes the FR-0 additive
 * extension (needsLabels + wantsLabels) with the full real-data metadata
 * shape required by spec §3.
 */

import type { ISODate } from '../lib/engine/parseDate';

// ── Base domain types re-exported from sandbox fixtures ──────────────────────

export type NeedsSubcategory = 'housing' | 'groceries' | 'utilities' | 'liabilities';

export type WantsSubcategory = 'restoration' | 'subscriptions' | 'variables';

export type Eur = number;

export interface CategoryLine<K extends string> {
  subcategory: K;
  amount: Eur;
  budget: Eur;
  percentage: number;
}

export interface BunkerSummary {
  survivalMonthlyCost: Eur;
  bunkerTarget: Eur;
  currentCash: Eur;
  monthsRemaining: number;
}

// FR-2 re-freeze: component props trimmed to spec §2 + A7
export interface BunkerHeaderProps {
  title: string;
  status: string;
}

export interface BunkerHeroProps {
  bunkerTarget: Eur;
  currentCash: Eur;
  monthsRemaining: number;
  survivalMonthlyCost: Eur;
}

export interface MacroGridProps {
  cards: readonly { label: string; value: number | string; trend: string }[];
}

export interface BunkerFixtures {
  header: BunkerHeaderProps;
  hero: BunkerHeroProps;
  macroGrid: MacroGridProps;
  auditSplit: AuditSplitProps;
  summary: BunkerSummary;
  /**
   * FR-4 (REQ-AGG-6) — derived threshold band.
   * Pure function of `(currentCash, bunkerTarget)`; absent when the predicate
   * returns undefined (healthy or zero-state). T8 reversal: this additive
   * field is the ONLY permitted drift on frozenContracts.ts.
   */
  threshold?: 'warning' | 'alert';
}

// ── AuditSplitProps — SUPERSEDES FR-0 frozen shape (closes W-1) ──────────────

/**
 * Frozen AuditSplitProps for FR-1 production.
 *
 * Supersedes the FR-0 additive extension (needsLabels + wantsLabels) with a
 * single bundled amendment per SDD Decision §W-1 Reconciliation.
 *
 * New shape keeps DI labels (needsLabels, wantsLabels) from the FR-0 extension
 * and adds real-data metadata required by spec §3 micro-metadata + trust signals:
 *   - sourceFiles: which CSVs fed the dataset
 *   - dateRange: drives "X.X months remaining" display
 *   - transactionCount: footer context ("out of N transactions")
 *   - ownerId: A1 — which user's data this is
 */
export interface AuditSplitProps {
  needs: readonly CategoryLine<NeedsSubcategory>[];
  wants: readonly CategoryLine<WantsSubcategory>[];
  optimizationPotential: number;
  /** DI labels — kept from FR-0 additive extension (W-1 reconciliation path b) */
  needsLabels: Record<NeedsSubcategory, string>;
  wantsLabels: Record<WantsSubcategory, string>;
  /** Real-data metadata — required for spec §3 micro-metadata + trust signals */
  sourceFiles: readonly string[];
  dateRange: { from: ISODate; to: ISODate };
  transactionCount: number;
  ownerId: string;
}
