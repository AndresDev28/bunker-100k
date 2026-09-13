/**
 * Production UI constants — ported from sandbox/src/labels.ts.
 *
 * REQ-UI-1/2: all visible strings in components MUST come from this module.
 * Zero inline JSX string literals. Typed against re-frozen unions from
 * sandbox-bridge/frozenContracts.ts.
 *
 * A4: sandbox/ untouched — this is a faithful port, not an import.
 */
import type { NeedsSubcategory, WantsSubcategory } from '@/sandbox-bridge/frozenContracts';

// Hero
export const HERO_TITLE = 'BUNKER TARGET (6-MONTH EMERGENCY FUND)';

// Section titles
export const NEEDS_SECTION_TITLE = 'Needs Breakdown';
export const WANTS_SECTION_TITLE = 'Optimization Zone (Wants)';

// MacroGrid card labels
export const LABEL_INCOME = 'Income Medios';
export const LABEL_WANTS = 'Wants / Superfluous';
export const LABEL_SAVE_RATE = 'Save Rate';

// MacroGrid card trends (view strings — no orphan literals in JSX)
export const TREND_INCOME = '↗ stable';
export const TREND_WANTS = '↘ review';
export const TREND_SAVE_RATE = '— baseline';

// Semantic done-gate labels
export const LABEL_BUNKER_TARGET = 'Bunker Target';
export const LABEL_SAVE_RATE_GATE = 'Save Rate';

// UploadDropzone (REQ-UI-20)
export const LABEL_UPLOAD_PROMPT = 'Drag & drop CSVs here';
export const LABEL_UPLOAD_ACTIVE = 'Drop to ingest';
export const LABEL_UPLOAD_BUTTON = 'Select CSV files';
export const LABEL_UPLOAD_BUSY = 'Ingesting…';
export const LABEL_UPLOAD_ERROR = 'Upload failed. Check the file and try again.';

// UploadDropzone result banner — formats the IngestResult counts into a single
// human-readable line. Three branches:
//   - skipped > 0  → partial (warn the user, point at the log)
//   - ingested > 0 → success
//   - only deduped → idempotent re-upload (still success, but call it out)
export const labelUploadResult = (result: {
  ingested: number;
  deduped: number;
  skipped: number;
}): string => {
  if (result.skipped > 0) {
    return `Ingested ${result.ingested}, skipped ${result.skipped} rows (parse errors). See ingest.log.`;
  }
  if (result.ingested > 0 && result.deduped > 0) {
    return `Ingested ${result.ingested}, deduped ${result.deduped} (already in store).`;
  }
  if (result.ingested > 0) {
    return `Ingested ${result.ingested} transactions.`;
  }
  if (result.deduped > 0) {
    return `Already up to date — deduped ${result.deduped}.`;
  }
  return 'No rows ingested.';
};

// Subcategory display maps
export const NEEDS_LABELS: Record<NeedsSubcategory, string> = {
  housing: 'Housing',
  groceries: 'Groceries',
  utilities: 'Utilities',
  liabilities: 'Liabilities',
};

export const WANTS_LABELS: Record<WantsSubcategory, string> = {
  restoration: 'Restoration',
  subscriptions: 'Subscriptions',
  variables: 'Variables',
  shopping: 'Shopping',
};

// Micro-metadata templates
export const microProgress = (pct: number, months: number): string =>
  `[${pct.toFixed(0)}%] | ${months.toFixed(1)} months remaining to safety`;

export const microSurvivalCost = (cost: number): string =>
  `*Survival Monthly Cost: ${cost.toLocaleString()} €/mo`;

export const optimizationFooter = (amount: number): string =>
  `*Optimization potential: +${amount.toLocaleString()} €/mo`;
