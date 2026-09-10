/**
 * T-10 — keyword classifier test block (REQ-CLS-1..7).
 *
 * Covers `matchRule` (pure first-match resolver) and the `classify` pipeline
 * (rules-first + sign-fallback). Strict TDD: this block is written RED before
 * `src/lib/classification/subcategoryRules.ts`, `defaultRules.ts` and the
 * `classify` body swap exist.
 */
import { describe, it, expect } from 'vitest';
import { matchRule, type SubcategoryRule } from '../subcategoryRules';
import { DEFAULT_SUBRULES } from '../defaultRules';
import { classify } from '@/lib/engine/classify';
import type { CategoryRef } from '@/lib/types/category';

describe('T-10 matchRule — first-match resolution (REQ-CLS-1)', () => {
  it('returns the FIRST matching rule, not the most specific one', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'netflix', tier: 'wants', subcategory: 'subscriptions' },
      { keyword: 'net', tier: 'wants', subcategory: 'variables' },
    ];

    const result = matchRule('NETFLIX.COM MONTHLY', rules);

    expect(result).not.toBeNull();
    expect(result?.keyword).toBe('netflix');
    expect(result?.subcategory).toBe('subscriptions');
  });

  it('returns null when no rule keyword is a substring of the description', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'netflix', tier: 'wants', subcategory: 'subscriptions' },
    ];

    expect(matchRule('UNKNOWN MERCHANT XYZ', rules)).toBeNull();
  });

  it('is pure — no I/O, deterministic across repeated calls', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'netflix', tier: 'wants', subcategory: 'subscriptions' },
    ];

    expect(matchRule('NETFLIX.COM', rules)).toEqual(matchRule('NETFLIX.COM', rules));
  });
});

describe('T-10 matchRule — iteration order (REQ-CLS-3)', () => {
  it('earlier rules shadow later ones whose keywords are more specific', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'a', tier: 'wants', subcategory: 'variables' },
      { keyword: 'amazon', tier: 'wants', subcategory: 'shopping' },
    ];

    const result = matchRule('AMAZON PRIME', rules);

    // Order wins: 'a' matches first, so the Amazon rule is never reached.
    expect(result?.keyword).toBe('a');
    expect(result?.subcategory).toBe('variables');
  });

  it('reversing rule order reverses the outcome', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'amazon', tier: 'wants', subcategory: 'shopping' },
      { keyword: 'a', tier: 'wants', subcategory: 'variables' },
    ];

    expect(matchRule('AMAZON PRIME', rules)?.subcategory).toBe('shopping');
  });
});

describe('T-10 matchRule — NFKD-safe matching (REQ-CLS-4)', () => {
  it('strips diacritics before matching — "MERCADOLÍBRE" matches "mercadolibre"', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'mercadolibre', tier: 'wants', subcategory: 'shopping' },
    ];

    const result = matchRule('MERCADOLÍBRE COMPRA', rules);

    expect(result).not.toBeNull();
    expect(result?.subcategory).toBe('shopping');
  });

  it('is punctuation-tolerant — "Netflix *Order#123" matches "netflix"', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'netflix', tier: 'wants', subcategory: 'subscriptions' },
    ];

    const result = matchRule('Netflix *Order#123', rules);

    expect(result).not.toBeNull();
    expect(result?.subcategory).toBe('subscriptions');
  });
});

describe('T-10 classify — pipeline rules-first then sign-fallback (REQ-CLS-2)', () => {
  it('positive amount with no keyword match → income/salary', () => {
    const result = classify('TRANSFER FROM EMPLOYER', 2500, []);

    expect(result).toEqual({ tier: 'income', subcategory: 'salary' });
  });

  it('negative amount with no keyword match → wants/variables', () => {
    const result = classify('RANDOM MERCHANT', -42, []);

    expect(result).toEqual({ tier: 'wants', subcategory: 'variables' });
  });

  it('zero amount with no keyword match → wants/variables (zero-is-wants)', () => {
    expect(classify('RANDOM MERCHANT', 0, [])).toEqual({ tier: 'wants', subcategory: 'variables' });
  });

  it('a keyword match beats the sign-fallback', () => {
    const result = classify('NETFLIX.COM MONTHLY', -15.99);

    expect(result).toEqual({ tier: 'wants', subcategory: 'subscriptions' });
  });
});

describe('T-10 classify — empty/whitespace description short-circuits (REQ-CLS-5)', () => {
  it('whitespace-only description falls back on sign, ignoring matching rules', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'netflix', tier: 'wants', subcategory: 'subscriptions' },
    ];

    expect(classify('   ', -10, rules)).toEqual({ tier: 'wants', subcategory: 'variables' });
  });

  it('empty description with a positive amount → income/salary', () => {
    expect(classify('', 100, DEFAULT_SUBRULES)).toEqual({ tier: 'income', subcategory: 'salary' });
  });
});

describe('T-10 classify — explicit rules override bypasses defaults (REQ-CLS-6)', () => {
  it('an empty override array does NOT consult DEFAULT_SUBRULES', () => {
    // 'NETFLIX' would resolve to wants/subscriptions via DEFAULT_SUBRULES.
    expect(classify('NETFLIX', -10, [])).toEqual({ tier: 'wants', subcategory: 'variables' });
  });

  it('a custom rule shadows the default for the same keyword', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'netflix', tier: 'needs', subcategory: 'utilities' },
    ];

    expect(classify('NETFLIX.COM', -10, rules)).toEqual({
      tier: 'needs',
      subcategory: 'utilities',
    });
  });

  it('omitting rules falls back to DEFAULT_SUBRULES', () => {
    expect(classify('MERCADOLIBRE COMPRA', -30)).toEqual({
      tier: 'wants',
      subcategory: 'shopping',
    });
  });
});

describe('T-10 DEFAULT_SUBRULES — seed list (REQ-CLS-7)', () => {
  const SEEDS: readonly (readonly [string, string, string])[] = [
    ['mercadolibre', 'wants', 'shopping'],
    ['netflix', 'wants', 'subscriptions'],
    ['salary', 'income', 'salary'],
    ['housing', 'needs', 'housing'],
    ['groceries', 'needs', 'groceries'],
    ['utilities', 'needs', 'utilities'],
    ['fuel', 'needs', 'liabilities'],
  ];

  it('declares the seed keywords in the exact REQ-CLS-7 order', () => {
    expect(DEFAULT_SUBRULES.map((r: SubcategoryRule) => r.keyword)).toEqual(SEEDS.map(([keyword]) => keyword));
  });

  it.each(SEEDS)('keyword "%s" resolves to %s/%s', (keyword, tier, subcategory) => {
    const result = matchRule(keyword, DEFAULT_SUBRULES);

    expect(result).not.toBeNull();
    expect(result?.tier).toBe(tier);
    expect(result?.subcategory).toBe(subcategory);
  });
});

// ── T1.5 TRIANGULATE — edge cases ─────────────────────────────────────────────

describe('T-10 triangulation — normalization edge cases', () => {
  it('matches a mixed-case keyword occurrence ("NeTfLiX")', () => {
    expect(classify('NeTfLiX MoNtHlY', -15.99)).toEqual({
      tier: 'wants',
      subcategory: 'subscriptions',
    });
  });

  it('diacritic folding is idempotent — repeated calls are byte-deterministic', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'mercadolibre', tier: 'wants', subcategory: 'shopping' },
    ];
    const input = 'MERCADOLÍBRE COMPRA ÑOÑO';

    const first = matchRule(input, rules);
    const second = matchRule(input, rules);

    expect(first).toEqual(second);
    expect(first?.subcategory).toBe('shopping');
  });

  it('tolerates several merchant codes around the keyword ("UBER *EATS.123#")', () => {
    const rules: readonly SubcategoryRule[] = [
      { keyword: 'uber', tier: 'wants', subcategory: 'variables' },
    ];

    expect(matchRule('UBER *EATS.123#', rules)?.keyword).toBe('uber');
  });

  it('rejects a null description at the type level and does not coerce it', () => {
    const call = (): CategoryRef =>
      // @ts-expect-error — `description` is typed `string`; null must not be accepted.
      classify(null, -10);

    expect(call).toThrow();
  });
});
