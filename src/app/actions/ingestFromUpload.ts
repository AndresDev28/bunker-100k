'use server';
/**
 * ingestFromUpload — Server Action entry point for browser drag-and-drop ingestion.
 *
 * Sibling of `ingestFromFolder`: same parse → ingest → upsert pipeline, different
 * acquisition source. Both converge on `upsertTransactions`, which is what keeps
 * dedup parity honest (REQ-CSV-6 rule 4).
 *
 * REQ-CSV-6: FormData['files'] fan-out, aggregated IngestResult, canonical logPath.
 * REQ-CSV-3: per-file failures append to state/ingest.log instead of throwing.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseCsv } from '@/lib/engine/parseCsv';
import { ingestTransactions } from '@/lib/engine/ingestTransactions';
import { readStore, upsertTransactions } from '@/lib/engine/store';
import { appendIngestLog } from '@/lib/engine/logger';
import { resolveDataDir, resolveOwnerId } from '@/lib/engine/env';
import type { IngestResult } from '@/lib/types/ingest';
import type { Transaction } from '@/lib/types/transaction';

const FILES_FIELD = 'files';

export async function ingestFromUpload(formData: FormData): Promise<IngestResult> {
  const ownerId = resolveOwnerId();
  const dataDir = resolveDataDir();
  const stateDir = path.join(dataDir, 'state');
  // REQ-CSV-6 rule 3: single source of truth, shared with ingestFromFolder.
  // Uploads have no parent directory, so deriving this from a filename would be
  // both wrong and unstable.
  const logPath = path.join(stateDir, 'ingest.log');

  await fs.mkdir(stateDir, { recursive: true });

  const files = formData
    .getAll(FILES_FIELD)
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return { ingested: 0, deduped: 0, skipped: 0, logPath, transactionCount: 0 };
  }

  let skipped = 0;
  const allCandidates: Transaction[] = [];

  for (const file of files) {
    let raw: string;
    try {
      raw = await file.text();
    } catch {
      await appendIngestLog(stateDir, {
        kind: 'skip',
        file: file.name,
        line: 0,
        reason: 'file-unreadable',
      });
      skipped += 1;
      continue;
    }

    let rows: ReturnType<typeof parseCsv>;
    try {
      rows = parseCsv(raw);
    } catch {
      // parseCsv is all-or-nothing per file, so one malformed row skips the file.
      await appendIngestLog(stateDir, {
        kind: 'skip',
        file: file.name,
        line: 0,
        reason: 'parse-error',
      });
      skipped += 1;
      continue;
    }

    allCandidates.push(...ingestTransactions(rows, ownerId, file.name));
  }

  // One upsert for the whole batch — same per-owner, per-run shape as the folder path.
  const { added, skipped: deduped } = await upsertTransactions(dataDir, ownerId, allCandidates);

  const transactionCount = (await readStore(dataDir, ownerId)).length;

  return { ingested: added, deduped, skipped, logPath, transactionCount };
}
