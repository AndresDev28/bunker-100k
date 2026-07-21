import { describe, it, expect, vi } from 'vitest';
import type { Transaction } from '@/lib/types/transaction';
import type { ISODate } from '@/lib/engine/parseDate';
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

// ── Fixture helpers ──────────────────────────────────────────────────────────

let idCounter = 0;
function makeTx(overrides: Partial<Transaction> & { amount: number; date?: ISODate }): Transaction {
  idCounter += 1;
  return {
    id: `tx-${idCounter}-${overrides.amount}`,
    date: (overrides.date ?? '2026-01-15') as ISODate,
    description: `desc-${idCounter}`,
    cleanedDescription: `clean-${idCounter}`,
    amount: overrides.amount,
    category: overrides.category ?? { tier: 'needs', subcategory: 'housing' },
    ownerId: overrides.ownerId ?? 'self',
    firstSeenAt: overrides.firstSeenAt ?? '2026-01-15T00:00:00.000Z',
    sourceFile: overrides.sourceFile ?? '/data/csv/jan.csv',
  };
}

function resetIds(): void {
  idCounter = 0;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('aggregate: buildBunkerViewModel', () => {
  // Dynamic import so the module is loaded fresh per describe block
  // (needed for the vi.mock in the delegation test to take effect).
  // For non-mocked tests we import at the top via a lazy getter.

  it('produces a zero-state BunkerFixtures for an empty Transaction[]', async () => {
    resetIds();
    const { buildBunkerViewModel } = await import('../buildBunkerViewModel');

    const result = buildBunkerViewModel([]);

    // BunkerSummary — all numeric fields are 0, not NaN/undefined
    expect(result.summary.survivalMonthlyCost).toBe(0);
    expect(result.summary.bunkerTarget).toBe(0);
    expect(result.summary.currentCash).toBe(0);
    expect(result.summary.monthsRemaining).toBe(0);

    // Hero mirrors summary
    expect(result.hero.survivalMonthlyCost).toBe(0);
    expect(result.hero.bunkerTarget).toBe(0);
    expect(result.hero.currentCash).toBe(0);
    expect(result.hero.monthsRemaining).toBe(0);

    // AuditSplit — frozen-length arrays, zero amounts
    expect(result.auditSplit.needs).toHaveLength(4);
    expect(result.auditSplit.wants).toHaveLength(3);
    for (const line of result.auditSplit.needs) {
      expect(line.amount).toBe(0);
      expect(line.budget).toBe(0);
      expect(line.percentage).toBe(0);
    }
    for (const line of result.auditSplit.wants) {
      expect(line.amount).toBe(0);
      expect(line.budget).toBe(0);
      expect(line.percentage).toBe(0);
    }

    // Metadata — zero-state sentinel (D8)
    expect(result.auditSplit.dateRange.from).toBe('1970-01-01');
    expect(result.auditSplit.dateRange.to).toBe('1970-01-01');
    expect(result.auditSplit.transactionCount).toBe(0);
    expect(result.auditSplit.sourceFiles).toEqual([]);
    expect(result.auditSplit.ownerId).toBe('self');
    expect(result.auditSplit.optimizationPotential).toBe(0);

    // No NaN anywhere in numeric fields
    const allNumbers = [
      result.summary.survivalMonthlyCost,
      result.summary.bunkerTarget,
      result.summary.currentCash,
      result.summary.monthsRemaining,
      result.auditSplit.optimizationPotential,
      ...result.auditSplit.needs.map((l) => l.amount),
      ...result.auditSplit.wants.map((l) => l.amount),
    ];
    for (const n of allNumbers) {
      expect(Number.isNaN(n)).toBe(false);
    }
  });

  it('groups needs into the 4 frozen subcategories and wants into the 3 frozen', async () => {
    resetIds();
    const { buildBunkerViewModel } = await import('../buildBunkerViewModel');

    // Degenerate FR-1 shape: 1 income (salary) + 1 wants (variables)
    // + explicit needs transactions to exercise grouping
    const txns: Transaction[] = [
      makeTx({ amount: 2000, category: { tier: 'income', subcategory: 'salary' } }),
      makeTx({ amount: -150, category: { tier: 'wants', subcategory: 'variables' } }),
      makeTx({ amount: -800, category: { tier: 'needs', subcategory: 'housing' } }),
      makeTx({ amount: -200, category: { tier: 'needs', subcategory: 'groceries' } }),
      makeTx({ amount: -100, category: { tier: 'needs', subcategory: 'utilities' } }),
      makeTx({ amount: -50, category: { tier: 'needs', subcategory: 'liabilities' } }),
      makeTx({ amount: -30, category: { tier: 'wants', subcategory: 'restoration' } }),
      makeTx({ amount: -20, category: { tier: 'wants', subcategory: 'subscriptions' } }),
    ];

    const result = buildBunkerViewModel(txns);

    // Needs — exactly 4 lines, keyed by frozen vocab
    const needsKeys = result.auditSplit.needs.map((l) => l.subcategory);
    expect(needsKeys).toEqual(['housing', 'groceries', 'utilities', 'liabilities']);

    // Wants — exactly 3 lines, keyed by frozen vocab
    const wantsKeys = result.auditSplit.wants.map((l) => l.subcategory);
    expect(wantsKeys).toEqual(['restoration', 'subscriptions', 'variables']);

    // Needs amounts — |amt| summed per subcategory
    const needsBySub = Object.fromEntries(
      result.auditSplit.needs.map((l) => [l.subcategory, l.amount]),
    );
    expect(needsBySub.housing).toBe(800);
    expect(needsBySub.groceries).toBe(200);
    expect(needsBySub.utilities).toBe(100);
    expect(needsBySub.liabilities).toBe(50);

    // Wants amounts — |amt| summed per subcategory
    const wantsBySub = Object.fromEntries(
      result.auditSplit.wants.map((l) => [l.subcategory, l.amount]),
    );
    expect(wantsBySub.restoration).toBe(30);
    expect(wantsBySub.subscriptions).toBe(20);
    expect(wantsBySub.variables).toBe(150);

    // Labels are populated from the labels module
    expect(result.auditSplit.needsLabels).toEqual(NEEDS_LABELS);
    expect(result.auditSplit.wantsLabels).toEqual(WANTS_LABELS);
  });

  it('derives sourceFiles / dateRange / transactionCount / ownerId from input', async () => {
    resetIds();
    const { buildBunkerViewModel } = await import('../buildBunkerViewModel');

    const txns: Transaction[] = [
      makeTx({
        amount: -100,
        date: '2026-01-10' as ISODate,
        sourceFile: '/data/csv/jan.csv',
        ownerId: 'alice',
      }),
      makeTx({
        amount: -200,
        date: '2026-02-15' as ISODate,
        sourceFile: '/data/csv/feb.csv',
        ownerId: 'alice',
      }),
      makeTx({
        amount: -50,
        date: '2026-01-25' as ISODate,
        sourceFile: '/data/csv/jan.csv', // duplicate sourceFile — must dedupe
        ownerId: 'alice',
      }),
    ];

    const result = buildBunkerViewModel(txns);

    // transactionCount = transactions.length
    expect(result.auditSplit.transactionCount).toBe(3);

    // sourceFiles — deduped, order preserved from first occurrence
    expect(result.auditSplit.sourceFiles).toEqual(['/data/csv/jan.csv', '/data/csv/feb.csv']);

    // dateRange — min/max from transaction dates
    expect(result.auditSplit.dateRange.from).toBe('2026-01-10');
    expect(result.auditSplit.dateRange.to).toBe('2026-02-15');

    // ownerId — from first transaction
    expect(result.auditSplit.ownerId).toBe('alice');
  });

  it('pins placeholder budget/percentage/monthsRemaining to documented FR-3 placeholders, not formulae', async () => {
    resetIds();
    const { buildBunkerViewModel } = await import('../buildBunkerViewModel');

    const txns: Transaction[] = [
      makeTx({ amount: -1400, category: { tier: 'needs', subcategory: 'housing' } }),
      makeTx({ amount: 3000, category: { tier: 'income', subcategory: 'salary' } }),
    ];

    const result = buildBunkerViewModel(txns);

    // Placeholder pin: currentCash = 0 (FR-3 REPLACES — non-final)
    expect(result.summary.currentCash).toBe(0);
    expect(result.hero.currentCash).toBe(0);

    // Placeholder pin: monthsRemaining = 0 (because currentCash=0, FR-3 REPLACES — non-final)
    expect(result.summary.monthsRemaining).toBe(0);
    expect(result.hero.monthsRemaining).toBe(0);

    // Placeholder pin: budget = 0 per CategoryLine (FR-3 REPLACES — non-final)
    for (const line of result.auditSplit.needs) {
      expect(line.budget).toBe(0);
    }
    for (const line of result.auditSplit.wants) {
      expect(line.budget).toBe(0);
    }

    // Placeholder pin: percentage = 0 per CategoryLine (FR-3 REPLACES — non-final)
    for (const line of result.auditSplit.needs) {
      expect(line.percentage).toBe(0);
    }
    for (const line of result.auditSplit.wants) {
      expect(line.percentage).toBe(0);
    }

    // Placeholder pin: optimizationPotential = 0 (FR-3 REPLACES — non-final)
    expect(result.auditSplit.optimizationPotential).toBe(0);

    // MacroGrid cards — placeholder values pinned
    expect(result.macroGrid.cards).toHaveLength(3);
    const cardsByLabel = Object.fromEntries(
      result.macroGrid.cards.map((c) => [c.label, c]),
    ) as Record<string, { label: string; value: number | string; trend: string }>;
    // FR-3 REPLACES — non-final: incomeMedios = 0
    expect(cardsByLabel[LABEL_INCOME]!.value).toBe(0);
    // FR-3 REPLACES — non-final: saveRate = 0
    expect(cardsByLabel[LABEL_SAVE_RATE]!.value).toBe(0);
    // Trends are static labels
    expect(cardsByLabel[LABEL_INCOME]!.trend).toBe(TREND_INCOME);
    expect(cardsByLabel[LABEL_WANTS]!.trend).toBe(TREND_WANTS);
    expect(cardsByLabel[LABEL_SAVE_RATE]!.trend).toBe(TREND_SAVE_RATE);
  });

  it('reuses computeBunkerTarget (survivalMonthlyCost × 6) — does not reimplement', async () => {
    resetIds();
    const { buildBunkerViewModel } = await import('../buildBunkerViewModel');

    // Verify delegation by asserting the output matches the FR-1 stub formula.
    // If buildBunkerViewModel reimplemented the math differently (e.g., ×12),
    // this test would fail. The stub returns survivalMonthlyCost × 6.
    const txns: Transaction[] = [
      makeTx({ amount: -1400, category: { tier: 'needs', subcategory: 'housing' } }),
    ];

    const result = buildBunkerViewModel(txns);

    // survivalMonthlyCost = |−1400| = 1400
    // bunkerTarget = computeBunkerTarget(1400, 0) = 1400 × 6 = 8400
    expect(result.summary.bunkerTarget).toBe(8400);
    expect(result.hero.bunkerTarget).toBe(8400);

    // Verify with a different input to force generalization (triangulation)
    const txns2: Transaction[] = [
      makeTx({ amount: -2000, category: { tier: 'needs', subcategory: 'housing' } }),
    ];
    const result2 = buildBunkerViewModel(txns2);
    // survivalMonthlyCost = 2000, bunkerTarget = 2000 × 6 = 12000
    expect(result2.summary.bunkerTarget).toBe(12000);
  });

  it('is pure — no I/O, no Date.now, referentially transparent', async () => {
    resetIds();
    const { buildBunkerViewModel } = await import('../buildBunkerViewModel');

    const txns: Transaction[] = [
      makeTx({ amount: -500, category: { tier: 'needs', subcategory: 'housing' } }),
      makeTx({ amount: -100, category: { tier: 'wants', subcategory: 'variables' } }),
      makeTx({ amount: 2000, category: { tier: 'income', subcategory: 'salary' } }),
    ];

    // Call twice with identical input
    const result1 = buildBunkerViewModel(txns);
    const result2 = buildBunkerViewModel(txns);

    // Deep-equal — referentially transparent
    expect(result1).toEqual(result2);

    // Verify no Date.now usage: spy on Date.now and confirm it's not called
    const dateNowSpy = vi.spyOn(Date, 'now');
    buildBunkerViewModel(txns);
    expect(dateNowSpy).not.toHaveBeenCalled();
    dateNowSpy.mockRestore();
  });

  it('header uses HERO_TITLE from labels', async () => {
    resetIds();
    const { buildBunkerViewModel } = await import('../buildBunkerViewModel');

    const result = buildBunkerViewModel([]);
    expect(result.header.title).toBe(HERO_TITLE);
  });
});

// ── FR-4 / REQ-AGG-6 — threshold derive rule (strict-TDD) ──────────────────
//
// Two integration scenarios pin the wiring between buildBunkerViewModel and
// deriveThreshold. They cover:
//   1. The placeholder-cash wiring: non-empty txs with bunkerTarget > 0 and
//      currentCash=0 → threshold === 'alert'.
//   2. The zero-state wiring: empty txs → threshold === undefined (no NaN,
//      REQ-AGG-5 holds).
describe('aggregate: buildBunkerViewModel — threshold wiring (REQ-AGG-6)', () => {
  it('yields threshold="alert" for non-empty txs with placeholder cash=0', async () => {
    resetIds();
    const { buildBunkerViewModel } = await import('../buildBunkerViewModel');

    // Any non-empty transaction set drives bunkerTarget > 0 while currentCash
    // is pinned to the FR-3 placeholder 0 → deriveThreshold(0, >0) === 'alert'.
    const txns: Transaction[] = [
      makeTx({ amount: -800, category: { tier: 'needs', subcategory: 'housing' } }),
      makeTx({ amount: -200, category: { tier: 'needs', subcategory: 'groceries' } }),
    ];

    const result = buildBunkerViewModel(txns);

    expect(result.summary.bunkerTarget).toBeGreaterThan(0);
    expect(result.summary.currentCash).toBe(0);
    expect(result.threshold).toBe('alert');
  });

  it('yields threshold=undefined for an empty transaction set (zero-state, REQ-AGG-5)', async () => {
    resetIds();
    const { buildBunkerViewModel } = await import('../buildBunkerViewModel');

    const result = buildBunkerViewModel([]);

    expect(result.summary.bunkerTarget).toBe(0);
    expect(result.threshold).toBeUndefined();
  });
});
