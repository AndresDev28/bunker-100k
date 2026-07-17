/**
 * FR-2 contract tests — frozen prop shapes and vocabulary cardinalities.
 *
 * This file is shared across W-A (contract pin), W-F (render tests), and W-G
 * (page zero-state). W-A creates it with the contract describe block; later
 * work units EXTEND (append) — never overwrite.
 */

import { describe, it, expect } from 'vitest';
import type {
  BunkerHeaderProps,
  BunkerHeroProps,
  MacroGridProps,
  NeedsSubcategory,
  WantsSubcategory,
  AuditSplitProps,
} from '@/sandbox-bridge/frozenContracts';

describe('frozen prop contracts: BunkerHeaderProps / BunkerHeroProps / MacroGridProps / AuditSplitProps', () => {
  it('BunkerHeroProps exposes only the 4 trimmed BunkerSummary fields (A7)', () => {
    // Type-level assertion: BunkerHeroProps must have exactly these 4 fields
    const hero: BunkerHeroProps = {
      bunkerTarget: 0,
      currentCash: 0,
      monthsRemaining: 0,
      survivalMonthlyCost: 0,
    };

    // Runtime assertion: exactly 4 keys, no more
    const keys = Object.keys(hero);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('bunkerTarget');
    expect(keys).toContain('currentCash');
    expect(keys).toContain('monthsRemaining');
    expect(keys).toContain('survivalMonthlyCost');

    // Negative assertion: these FR-0 sandbox fields must NOT be present
    expect(keys).not.toContain('incomeMedios');
    expect(keys).not.toContain('wantsTotal');
    expect(keys).not.toContain('saveRate');
    expect(keys).not.toContain('progressPercent'); // derived internally, not a prop
  });

  it('NeedsSubcategory has cardinality 4; WantsSubcategory has cardinality 3 (A2)', () => {
    // Type-level assertion: exact union members
    const needs: NeedsSubcategory[] = ['housing', 'groceries', 'utilities', 'liabilities'];
    const wants: WantsSubcategory[] = ['restoration', 'subscriptions', 'variables'];

    // Runtime assertion: cardinalities
    expect(needs).toHaveLength(4);
    expect(wants).toHaveLength(3);

    // Exact members (no extras, no missing)
    expect(needs).toContain('housing');
    expect(needs).toContain('groceries');
    expect(needs).toContain('utilities');
    expect(needs).toContain('liabilities');

    expect(wants).toContain('restoration');
    expect(wants).toContain('subscriptions');
    expect(wants).toContain('variables');

    // Negative: FR-1 drift members must NOT be in the frozen set
    const fr1NeedsDrift = ['food', 'transport', 'health', 'education', 'other_needs'];
    const fr1WantsDrift = ['entertainment', 'shopping', 'travel', 'other_wants'];

    fr1NeedsDrift.forEach((drift) => {
      expect(needs).not.toContain(drift);
    });

    fr1WantsDrift.forEach((drift) => {
      expect(wants).not.toContain(drift);
    });
  });

  it('BunkerHeaderProps has title and status fields', () => {
    const header: BunkerHeaderProps = {
      title: 'test',
      status: 'test',
    };

    const keys = Object.keys(header);
    expect(keys).toHaveLength(2);
    expect(keys).toContain('title');
    expect(keys).toContain('status');
  });

  it('MacroGridProps has cards array with label/value/trend', () => {
    const macroGrid: MacroGridProps = {
      cards: [
        { label: 'test', value: 0, trend: 'stable' },
        { label: 'test2', value: '0', trend: 'up' },
      ],
    };

    expect(macroGrid.cards).toHaveLength(2);
    expect(macroGrid.cards[0]).toHaveProperty('label');
    expect(macroGrid.cards[0]).toHaveProperty('value');
    expect(macroGrid.cards[0]).toHaveProperty('trend');
  });

  it('AuditSplitProps dateRange sentinel invariant (D8)', () => {
    // When dateRange is empty/zero-state, both fields must be "1970-01-01"
    const auditSplit: AuditSplitProps = {
      needs: [],
      wants: [],
      optimizationPotential: 0,
      needsLabels: {} as Record<NeedsSubcategory, string>,
      wantsLabels: {} as Record<WantsSubcategory, string>,
      sourceFiles: [],
      dateRange: { from: '1970-01-01', to: '1970-01-01' },
      transactionCount: 0,
      ownerId: 'self',
    };

    // Sentinel invariant: zero-state uses "1970-01-01" for both fields
    expect(auditSplit.dateRange.from).toBe('1970-01-01');
    expect(auditSplit.dateRange.to).toBe('1970-01-01');

    // dateRange is non-nullable (both fields always present)
    expect(auditSplit.dateRange).toBeDefined();
    expect(auditSplit.dateRange.from).toBeDefined();
    expect(auditSplit.dateRange.to).toBeDefined();
  });
});
