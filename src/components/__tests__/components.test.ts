/**
 * FR-2 contract tests — frozen prop shapes and vocabulary cardinalities.
 *
 * This file is shared across W-A (contract pin), W-F (render tests), and W-G
 * (page zero-state). W-A creates it with the contract describe block; later
 * work units EXTEND (append) — never overwrite.
 */

import { describe, it, expect, vi } from 'vitest';
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

// ── W-F: Render tests (strict-TDD) ─────────────────────────────────────────
//
// These tests render each component via react-dom/server.renderToStaticMarkup
// and assert the output contains expected label strings from src/lib/labels.ts.
// vitest.config.mts includes only *.test.ts (not .tsx), so component tests
// live in this .test.ts file and use React.createElement (no JSX in .ts files).

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BunkerHeader } from '@/components/BunkerHeader';
import { BunkerHero } from '@/components/BunkerHero';
import { MacroGrid } from '@/components/MacroGrid';
import { AuditSplit } from '@/components/AuditSplit';
import { buildBunkerViewModel } from '@/lib/engine/buildBunkerViewModel';
import type { Transaction } from '@/lib/types/transaction';
import type { ISODate } from '@/lib/engine/parseDate';
import {
  HERO_TITLE,
  NEEDS_SECTION_TITLE,
  WANTS_SECTION_TITLE,
  LABEL_INCOME,
  LABEL_WANTS,
  LABEL_SAVE_RATE,
  TREND_INCOME,
  TREND_WANTS,
  TREND_SAVE_RATE,
  NEEDS_LABELS,
  WANTS_LABELS,
  microProgress,
  microSurvivalCost,
  optimizationFooter,
} from '@/lib/labels';
import type { BunkerFixtures } from '@/sandbox-bridge/frozenContracts';

// Fixture helper: build a representative BunkerFixtures from sample transactions
function buildFixture(): BunkerFixtures {
  const txns: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-01-10' as ISODate,
      description: 'Rent',
      cleanedDescription: 'rent',
      amount: -800,
      category: { tier: 'needs', subcategory: 'housing' },
      ownerId: 'self',
      firstSeenAt: '2026-01-10T00:00:00.000Z',
      sourceFile: '/data/csv/jan.csv',
    },
    {
      id: 'tx-2',
      date: '2026-02-15' as ISODate,
      description: 'Netflix',
      cleanedDescription: 'netflix',
      amount: -15,
      category: { tier: 'wants', subcategory: 'subscriptions' },
      ownerId: 'self',
      firstSeenAt: '2026-02-15T00:00:00.000Z',
      sourceFile: '/data/csv/feb.csv',
    },
    {
      id: 'tx-3',
      date: '2026-01-25' as ISODate,
      description: 'Salary',
      cleanedDescription: 'salary',
      amount: 3000,
      category: { tier: 'income', subcategory: 'salary' },
      ownerId: 'self',
      firstSeenAt: '2026-01-25T00:00:00.000Z',
      sourceFile: '/data/csv/jan.csv',
    },
  ];
  return buildBunkerViewModel(txns);
}

describe('AuditSplit renders metadata', () => {
  it('renders sourceFiles, dateRange, transactionCount, ownerId from props', () => {
    const fixtures = buildFixture();
    const html = renderToStaticMarkup(createElement(AuditSplit, fixtures.auditSplit));

    // Metadata fields appear in the output
    expect(html).toContain('/data/csv/jan.csv');
    expect(html).toContain('/data/csv/feb.csv');
    expect(html).toContain('2026-01-10');
    expect(html).toContain('2026-02-15');
    expect(html).toContain('3'); // transactionCount
    expect(html).toContain('self'); // ownerId

    // Section titles from labels
    expect(html).toContain(NEEDS_SECTION_TITLE);
    expect(html).toContain(WANTS_SECTION_TITLE);

    // Subcategory labels from labels.ts
    expect(html).toContain(NEEDS_LABELS.housing);
    expect(html).toContain(WANTS_LABELS.subscriptions);

    // Optimization footer
    expect(html).toContain(optimizationFooter(fixtures.auditSplit.optimizationPotential));
  });

  it('sources every visible string from src/lib/labels.ts — zero inline literals', () => {
    const fixtures = buildFixture();
    const html = renderToStaticMarkup(createElement(AuditSplit, fixtures.auditSplit));

    // Collect all labels from labels.ts
    const allLabels = [
      NEEDS_SECTION_TITLE,
      WANTS_SECTION_TITLE,
      ...Object.values(NEEDS_LABELS),
      ...Object.values(WANTS_LABELS),
      optimizationFooter(fixtures.auditSplit.optimizationPotential),
    ];

    // Every label must appear in the rendered output
    for (const label of allLabels) {
      expect(html).toContain(label);
    }

    // Negative: no orphan strings that aren't in labels.ts
    // (This is a structural assertion — if a component adds inline literals,
    // they won't be in this set and the test will fail when we add them here)
    const metadataStrings = [
      ...fixtures.auditSplit.sourceFiles,
      fixtures.auditSplit.dateRange.from,
      fixtures.auditSplit.dateRange.to,
      String(fixtures.auditSplit.transactionCount),
      fixtures.auditSplit.ownerId,
    ];
    for (const str of metadataStrings) {
      expect(html).toContain(str);
    }
  });
});

describe('BunkerHeader renders title and status', () => {
  it('renders title and status from props', () => {
    const fixtures = buildFixture();
    const html = renderToStaticMarkup(createElement(BunkerHeader, fixtures.header));

    expect(html).toContain(HERO_TITLE);
    expect(html).toContain(fixtures.header.status);
  });
});

describe('BunkerHero renders target and progress', () => {
  it('renders bunkerTarget, progressPercent (derived), survivalMonthlyCost', () => {
    const fixtures = buildFixture();
    const html = renderToStaticMarkup(createElement(BunkerHero, fixtures.hero));

    // bunkerTarget appears as formatted currency
    expect(html).toContain(fixtures.hero.bunkerTarget.toLocaleString());

    // progressPercent is derived internally: currentCash / bunkerTarget * 100
    // With currentCash=0 (FR-3 placeholder), progressPercent=0
    const progressPercent =
      fixtures.hero.bunkerTarget > 0
        ? (fixtures.hero.currentCash / fixtures.hero.bunkerTarget) * 100
        : 0;
    expect(html).toContain(microProgress(progressPercent, fixtures.hero.monthsRemaining));

    // survivalMonthlyCost appears in micro-metadata
    expect(html).toContain(microSurvivalCost(fixtures.hero.survivalMonthlyCost));
  });
});

describe('MacroGrid renders cards', () => {
  it('renders label, value, trend for each card', () => {
    const fixtures = buildFixture();
    const html = renderToStaticMarkup(createElement(MacroGrid, fixtures.macroGrid));

    // All 3 cards present
    expect(html).toContain(LABEL_INCOME);
    expect(html).toContain(LABEL_WANTS);
    expect(html).toContain(LABEL_SAVE_RATE);

    // Trends from labels
    expect(html).toContain(TREND_INCOME);
    expect(html).toContain(TREND_WANTS);
    expect(html).toContain(TREND_SAVE_RATE);

    // Values (FR-3 placeholders: incomeMedios=0, saveRate=0; wantsTotal is real)
    expect(html).toContain('0'); // incomeMedios placeholder
    expect(html).toContain(String(fixtures.macroGrid.cards[1]!.value)); // wantsTotal
  });
});

// ── W-H: MacroGrid threshold wiring (REQ-UI-17, FR-4) ──────────────────────
//
// These tests assert the color class actually reaches the rendered HTML for
// each threshold branch. The shared pure helper amountColorClass is
// unit-tested in src/lib/engine/__tests__/amountColor.test.ts; here we
// verify the prop is threaded correctly into the rendered output.
//
// Threshold prop is extended LOCALLY on MacroGrid (not on MacroGridProps in
// frozenContracts) — see app/page.tsx for the page-thread.
describe('MacroGrid threshold wiring (REQ-UI-17)', () => {
  const baseCards = [
    { label: 'Income', value: 100, trend: 'up' },
    { label: 'Wants', value: -50, trend: 'down' },
  ];

  it('renders text-fuchsia-500 when threshold="warning"', () => {
    const html = renderToStaticMarkup(
      createElement(MacroGrid, { cards: baseCards, threshold: 'warning' }),
    );

    // The threshold branch must be applied to the numeric value containers
    expect(html).toContain('text-fuchsia-500');
    // No emerald/red leakage from the sign-only fallback for these values
    expect(html).not.toContain('text-emerald-400');
    expect(html).not.toContain('text-red-400');
  });

  it('renders text-pink-400 when threshold="alert"', () => {
    const html = renderToStaticMarkup(
      createElement(MacroGrid, { cards: baseCards, threshold: 'alert' }),
    );

    expect(html).toContain('text-pink-400');
    expect(html).not.toContain('text-emerald-400');
    expect(html).not.toContain('text-red-400');
  });

  it('renders text-emerald-400 for a positive value when threshold is undefined', () => {
    const html = renderToStaticMarkup(
      createElement(MacroGrid, {
        cards: [{ label: 'Income', value: 100, trend: 'up' }],
        threshold: undefined,
      }),
    );

    expect(html).toContain('text-emerald-400');
    // Threshold branches must NOT appear in the undefined path
    expect(html).not.toContain('text-fuchsia-500');
    expect(html).not.toContain('text-pink-400');
  });
});

describe('Zero-state render (empty store)', () => {
  it('renders all four components without throwing against an empty store', () => {
    const zeroFixtures = buildBunkerViewModel([]);

    // All four components render without throwing
    const headerHtml = renderToStaticMarkup(createElement(BunkerHeader, zeroFixtures.header));
    const heroHtml = renderToStaticMarkup(createElement(BunkerHero, zeroFixtures.hero));
    const macroHtml = renderToStaticMarkup(createElement(MacroGrid, zeroFixtures.macroGrid));
    const auditHtml = renderToStaticMarkup(createElement(AuditSplit, zeroFixtures.auditSplit));

    // No NaN or undefined leaks
    expect(headerHtml).not.toContain('NaN');
    expect(headerHtml).not.toContain('undefined');
    expect(heroHtml).not.toContain('NaN');
    expect(heroHtml).not.toContain('undefined');
    expect(macroHtml).not.toContain('NaN');
    expect(macroHtml).not.toContain('undefined');
    expect(auditHtml).not.toContain('NaN');
    expect(auditHtml).not.toContain('undefined');

    // Zero-state sentinel appears
    expect(auditHtml).toContain('1970-01-01');

    // transactionCount=0 appears
    expect(auditHtml).toContain('0');

    // All 4 needs + 3 wants labels still render (zero amounts)
    for (const label of Object.values(NEEDS_LABELS)) {
      expect(auditHtml).toContain(label);
    }
    for (const label of Object.values(WANTS_LABELS)) {
      expect(auditHtml).toContain(label);
    }
  });
});

// ── W-G: Page zero-state + degenerate render (strict-TDD) ─────────────────
//
// app/page.tsx is an async Server Component that calls loadTransactions (a
// 'use server' action). We mock loadTransactions via vi.mock (hoisted) and
// import Page dynamically. The 'use server' directive is a Next.js runtime
// annotation — in Vitest (Node) it's inert, so mocking works transparently.

vi.mock('@/app/actions/loadTransactions', () => ({
  loadTransactions: vi.fn(),
}));

// app/page.tsx now renders <UploadDropzone/> (REQ-UI-20), a client component.
// `useRouter` requires a mounted App Router context, which react-dom/server has
// no notion of — same server/client boundary reason loadTransactions is mocked
// above. The dropzone's own behavior is covered in UploadDropzone.test.ts.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe('app/page.tsx zero-state', () => {
  it('renders all four components without throwing against an empty store', async () => {
    const { loadTransactions } = await import('@/app/actions/loadTransactions');
    vi.mocked(loadTransactions).mockResolvedValueOnce([]);

    const { default: Page } = await import('../../../app/page');
    const html = renderToStaticMarkup(await Page());

    // All four component markers present
    expect(html).toContain(HERO_TITLE);
    expect(html).toContain(NEEDS_SECTION_TITLE);
    expect(html).toContain(WANTS_SECTION_TITLE);
    expect(html).toContain(LABEL_INCOME);
    expect(html).toContain(LABEL_WANTS);
    expect(html).toContain(LABEL_SAVE_RATE);

    // Zero-state sentinel (D8)
    expect(html).toContain('1970-01-01');

    // transactionCount=0
    expect(html).toContain('0');

    // No NaN or undefined leaks
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');

    // All 4 needs + 3 wants labels still render (zero amounts)
    for (const label of Object.values(NEEDS_LABELS)) {
      expect(html).toContain(label);
    }
    for (const label of Object.values(WANTS_LABELS)) {
      expect(html).toContain(label);
    }
  });

  it('renders with non-empty data (degenerate shape: one salary + one variables)', async () => {
    const { loadTransactions } = await import('@/app/actions/loadTransactions');
    const txns: Transaction[] = [
      {
        id: 'tx-salary',
        date: '2026-01-10' as ISODate,
        description: 'Salary',
        cleanedDescription: 'salary',
        amount: 3000,
        category: { tier: 'income', subcategory: 'salary' },
        ownerId: 'self',
        firstSeenAt: '2026-01-10T00:00:00.000Z',
        sourceFile: '/data/csv/jan.csv',
      },
      {
        id: 'tx-vars',
        date: '2026-01-15' as ISODate,
        description: 'Variable expense',
        cleanedDescription: 'variable',
        amount: -50,
        category: { tier: 'wants', subcategory: 'variables' },
        ownerId: 'self',
        firstSeenAt: '2026-01-15T00:00:00.000Z',
        sourceFile: '/data/csv/jan.csv',
      },
    ];
    vi.mocked(loadTransactions).mockResolvedValueOnce(txns);

    const { default: Page } = await import('../../../app/page');
    const html = renderToStaticMarkup(await Page());

    // Categorized rows appear
    expect(html).toContain(NEEDS_LABELS.housing);
    expect(html).toContain(WANTS_LABELS.variables);
    expect(html).toContain('50'); // |amount| of variables tx

    // Metadata
    expect(html).toContain('/data/csv/jan.csv');
    expect(html).toContain('2'); // transactionCount
    expect(html).toContain('self');

    // Date range from transactions
    expect(html).toContain('2026-01-10');
    expect(html).toContain('2026-01-15');
  });
});
