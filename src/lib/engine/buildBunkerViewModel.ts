/**
 * Pure aggregate: Transaction[] → BunkerFixtures.
 *
 * REQ-AGG-1: PURE function — no I/O, no Date.now(), no side effects,
 * deterministic given input. Lives under src/lib/engine/ (G1).
 *
 * Placeholder discipline (A6): every non-trivial derivation that is NOT
 * the final FR-3 math carries a `// FR-3 REPLACES — non-final` comment.
 * FR-3 will replace these with Δ_M + monthly averages + B_t = C_s × 6.
 */
import type { Transaction } from '@/lib/types/transaction';
import type { ISODate } from '@/lib/engine/parseDate';
import { computeBunkerTarget } from '@/lib/engine/computeBunkerTarget';
import { deriveThreshold } from '@/lib/engine/deriveThreshold';
import {
  NEEDS_LABELS,
  WANTS_LABELS,
  HERO_TITLE,
  LABEL_INCOME,
  LABEL_WANTS,
  LABEL_SAVE_RATE,
  TREND_INCOME,
  TREND_WANTS,
  TREND_SAVE_RATE,
} from '@/lib/labels';
import type {
  BunkerFixtures,
  BunkerSummary,
  BunkerHeroProps,
  BunkerHeaderProps,
  MacroGridProps,
  AuditSplitProps,
  CategoryLine,
  NeedsSubcategory,
  WantsSubcategory,
  Eur,
} from '@/sandbox-bridge/frozenContracts';

// ── Constants ────────────────────────────────────────────────────────────────

/** D8: zero-state sentinel for dateRange when transactions.length === 0. */
const ZERO_DATE_SENTINEL: ISODate = '1970-01-01' as ISODate;

/** Frozen vocabulary — iteration order defines CategoryLine[] order. */
const NEEDS_KEYS: readonly NeedsSubcategory[] = [
  'housing',
  'groceries',
  'utilities',
  'liabilities',
];

const WANTS_KEYS: readonly WantsSubcategory[] = ['restoration', 'subscriptions', 'variables', 'shopping'];

// ── Aggregate ────────────────────────────────────────────────────────────────

/**
 * Build the full BunkerFixtures view-model from persisted transactions.
 *
 * Pure: no I/O, no Date.now(), referentially transparent.
 */
export function buildBunkerViewModel(transactions: readonly Transaction[]): BunkerFixtures {
  // ── Tier totals (|amt| summed per tier) ──────────────────────────────────
  let survivalMonthlyCost: Eur = 0;
  let wantsTotal: Eur = 0;

  // Per-subcategory accumulators
  const needsAmounts: Record<NeedsSubcategory, Eur> = {
    housing: 0,
    groceries: 0,
    utilities: 0,
    liabilities: 0,
  };
  const wantsAmounts: Record<WantsSubcategory, Eur> = {
    restoration: 0,
    subscriptions: 0,
    variables: 0,
    shopping: 0,
  };

  for (const t of transactions) {
    const absAmt = Math.abs(t.amount);
    if (t.category.tier === 'needs') {
      survivalMonthlyCost += absAmt;
      const sub = t.category.subcategory;
      if (sub in needsAmounts) {
        needsAmounts[sub as NeedsSubcategory] += absAmt;
      }
    } else if (t.category.tier === 'wants') {
      wantsTotal += absAmt;
      const sub = t.category.subcategory;
      if (sub in wantsAmounts) {
        wantsAmounts[sub as WantsSubcategory] += absAmt;
      }
    }
    // tier === 'income' does not contribute to needs/wants totals
  }

  // ── Placeholder derivations (FR-3 REPLACES — non-final) ──────────────────

  // FR-3 REPLACES — non-final: currentCash is pinned to 0 until FR-3
  // introduces real cash-balance tracking.
  const currentCash: Eur = 0;

  // FR-3 REPLACES — non-final: monthsRemaining = 0 because currentCash = 0.
  // When FR-3 provides real currentCash, this becomes currentCash / cost.
  const monthsRemaining: number =
    currentCash > 0 && survivalMonthlyCost > 0 ? currentCash / survivalMonthlyCost : 0;

  // Delegate to FR-1 stub — DO NOT reimplement. computeBunkerTarget returns
  // survivalMonthlyCost × 6 (REQ-DEDUP-5). FR-3 will replace the stub body.
  const bunkerTarget: Eur = computeBunkerTarget(survivalMonthlyCost, wantsTotal);

  // ── CategoryLine[] — always 4 needs + 3 wants, zeros for missing keys ────

  // FR-3 REPLACES — non-final: budget per line is pinned to 0.
  // FR-3 will compute dynamic budgets from monthly averages.
  const PLACEHOLDER_BUDGET: Eur = 0;

  // FR-3 REPLACES — non-final: percentage per line is pinned to 0.
  // FR-3 will compute percentage = amount / budget * 100.
  const PLACEHOLDER_PERCENTAGE: number = 0;

  const needs: readonly CategoryLine<NeedsSubcategory>[] = NEEDS_KEYS.map((k) => ({
    subcategory: k,
    amount: needsAmounts[k],
    budget: PLACEHOLDER_BUDGET,
    percentage: PLACEHOLDER_PERCENTAGE,
  }));

  const wants: readonly CategoryLine<WantsSubcategory>[] = WANTS_KEYS.map((k) => ({
    subcategory: k,
    amount: wantsAmounts[k],
    budget: PLACEHOLDER_BUDGET,
    percentage: PLACEHOLDER_PERCENTAGE,
  }));

  // ── Metadata from input (REQ-AGG-3) ──────────────────────────────────────

  // sourceFiles — deduped, insertion order preserved
  const sourceFilesSet = new Set<string>();
  for (const t of transactions) {
    sourceFilesSet.add(t.sourceFile);
  }
  const sourceFiles: readonly string[] = [...sourceFilesSet];

  // dateRange — min/max transaction dates, or sentinel for empty (D8)
  let dateRangeFrom: ISODate = ZERO_DATE_SENTINEL;
  let dateRangeTo: ISODate = ZERO_DATE_SENTINEL;
  if (transactions.length > 0) {
    const first = transactions[0]!;
    dateRangeFrom = first.date;
    dateRangeTo = first.date;
    for (let i = 1; i < transactions.length; i++) {
      const t = transactions[i]!;
      const d = t.date;
      if (d < dateRangeFrom) dateRangeFrom = d as ISODate;
      if (d > dateRangeTo) dateRangeTo = d as ISODate;
    }
  }

  const transactionCount: number = transactions.length;

  // A1: ownerId from first transaction, default 'self'
  const ownerId: string = transactions[0]?.ownerId ?? 'self';

  // FR-3 REPLACES — non-final: optimizationPotential pinned to 0.
  const optimizationPotential: number = 0;

  // ── Assemble BunkerFixtures ──────────────────────────────────────────────

  const summary: BunkerSummary = {
    survivalMonthlyCost,
    bunkerTarget,
    currentCash,
    monthsRemaining,
  };

  const hero: BunkerHeroProps = {
    bunkerTarget,
    currentCash,
    monthsRemaining,
    survivalMonthlyCost,
  };

  const header: BunkerHeaderProps = {
    title: HERO_TITLE,
    status: '',
  };

  // FR-3 REPLACES — non-final: incomeMedios card value pinned to 0.
  // FR-3 will compute real income aggregation.
  const PLACEHOLDER_INCOME_MEDIOS: Eur = 0;

  // FR-3 REPLACES — non-final: saveRate card value pinned to 0.
  // FR-3 will compute real save rate.
  const PLACEHOLDER_SAVE_RATE: number = 0;

  const macroGrid: MacroGridProps = {
    cards: [
      { label: LABEL_INCOME, value: PLACEHOLDER_INCOME_MEDIOS, trend: TREND_INCOME },
      { label: LABEL_WANTS, value: wantsTotal, trend: TREND_WANTS },
      { label: LABEL_SAVE_RATE, value: PLACEHOLDER_SAVE_RATE, trend: TREND_SAVE_RATE },
    ],
  };

  const auditSplit: AuditSplitProps = {
    needs,
    wants,
    optimizationPotential,
    needsLabels: NEEDS_LABELS,
    wantsLabels: WANTS_LABELS,
    sourceFiles,
    dateRange: { from: dateRangeFrom, to: dateRangeTo },
    transactionCount,
    ownerId,
  };

  // FR-4 (REQ-AGG-6): derive threshold band from the already-computed
  // (currentCash, bunkerTarget). Use conditional spread so the field is
  // OMITTED — not assigned undefined — under exactOptionalPropertyTypes.
  const threshold: 'warning' | 'alert' | undefined = deriveThreshold(currentCash, bunkerTarget);

  return {
    header,
    hero,
    macroGrid,
    auditSplit,
    summary,
    ...(threshold !== undefined ? { threshold } : {}),
  };
}
