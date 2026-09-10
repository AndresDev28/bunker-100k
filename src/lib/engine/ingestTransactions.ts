import { cleanDescription } from './cleanDescription';
import { hashTransaction } from './hash';
import { classify } from './classify';
import type { CsvRow } from './parseCsv';
import type { Transaction } from '@/lib/types/transaction';

/**
 * Shared internal ingestion API — transforms parsed CSV rows into Transaction objects.
 * Acquisition-agnostic: used by ingestFromFolder (FR-1) and future ingestFromUpload (FR-N).
 *
 * Each Transaction gets:
 * - id = SHA-256(date | cleanedDescription | amount) — dedup key
 * - cleanedDescription = normalized for hashing
 * - category = keyword rules with sign-fallback (FR-2, REQ-CLS-2)
 * - firstSeenAt = wall-clock ISO-8601 at moment of ingestion
 * - ownerId / sourceFile = passed through
 *
 * REQ-CSV-4: every parsed row routes through here before any persistence.
 * REQ-DEDUP-1: id is deterministic — same {date, cleanedDescription, amount} → same id.
 */
export function ingestTransactions(
  rows: readonly CsvRow[],
  ownerId: string,
  sourceFile: string,
): Transaction[] {
  const now = new Date().toISOString();
  return rows.map((row) => {
    const cleanedDescription = cleanDescription(row.description);
    const id = hashTransaction({ date: row.date, cleanedDescription, amount: row.amount });
    return {
      id,
      date: row.date,
      description: row.description,
      cleanedDescription,
      amount: row.amount,
      category: classify(row.description, row.amount),
      ownerId,
      firstSeenAt: now,
      sourceFile,
    };
  });
}
