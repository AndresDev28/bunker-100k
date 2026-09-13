/**
 * labels.ts — ported UI constants from sandbox/src/labels.ts.
 *
 * REQ-UI-1/2: production labels typed against re-frozen unions.
 * Zero inline JSX string literals in components — all view strings live here.
 */
import { describe, it, expect } from 'vitest';
import {
  HERO_TITLE,
  NEEDS_LABELS,
  WANTS_LABELS,
  microProgress,
  microSurvivalCost,
  optimizationFooter,
  labelUploadResult,
} from '../labels';

describe('labels port', () => {
  it('NEEDS_LABELS has exactly 4 keys matching re-frozen NeedsSubcategory', () => {
    const keys = Object.keys(NEEDS_LABELS).sort();
    expect(keys).toEqual(['groceries', 'housing', 'liabilities', 'utilities']);
  });

  it('WANTS_LABELS has exactly 4 keys matching re-frozen WantsSubcategory', () => {
    const keys = Object.keys(WANTS_LABELS).sort();
    expect(keys).toEqual(['restoration', 'shopping', 'subscriptions', 'variables']);
  });

  it('NEEDS_LABELS display strings match sandbox verbatim', () => {
    expect(NEEDS_LABELS.housing).toBe('Housing');
    expect(NEEDS_LABELS.groceries).toBe('Groceries');
    expect(NEEDS_LABELS.utilities).toBe('Utilities');
    expect(NEEDS_LABELS.liabilities).toBe('Liabilities');
  });

  it('WANTS_LABELS display strings match sandbox verbatim', () => {
    expect(WANTS_LABELS.restoration).toBe('Restoration');
    expect(WANTS_LABELS.subscriptions).toBe('Subscriptions');
    expect(WANTS_LABELS.variables).toBe('Variables');
  });

  it('HERO_TITLE matches sandbox verbatim', () => {
    expect(HERO_TITLE).toBe('BUNKER TARGET (6-MONTH EMERGENCY FUND)');
  });

  it('microProgress template produces correct output', () => {
    expect(microProgress(50, 3.5)).toBe('[50%] | 3.5 months remaining to safety');
  });

  it('microSurvivalCost template produces correct output', () => {
    expect(microSurvivalCost(1500)).toBe('*Survival Monthly Cost: 1,500 €/mo');
  });

      it('optimizationFooter template produces correct output', () => {
        expect(optimizationFooter(200)).toBe('*Optimization potential: +200 €/mo');
      });

      it('labelUploadResult — partial (skipped > 0) surfaces the warning', () => {
        expect(labelUploadResult({ ingested: 3, deduped: 0, skipped: 2 })).toBe(
          'Ingested 3, skipped 2 rows (parse errors). See ingest.log.',
        );
      });

      it('labelUploadResult — success with dedup', () => {
        expect(labelUploadResult({ ingested: 4, deduped: 1, skipped: 0 })).toBe(
          'Ingested 4, deduped 1 (already in store).',
        );
      });

      it('labelUploadResult — pure success', () => {
        expect(labelUploadResult({ ingested: 5, deduped: 0, skipped: 0 })).toBe(
          'Ingested 5 transactions.',
        );
      });

      it('labelUploadResult — re-upload with only dedup hits (idempotent)', () => {
        expect(labelUploadResult({ ingested: 0, deduped: 5, skipped: 0 })).toBe(
          'Already up to date — deduped 5.',
        );
      });

      it('labelUploadResult — empty result fallback', () => {
        expect(labelUploadResult({ ingested: 0, deduped: 0, skipped: 0 })).toBe(
          'No rows ingested.',
        );
      });
    });
