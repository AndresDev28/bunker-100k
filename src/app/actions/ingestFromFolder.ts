'use server';
/**
 * ingestFromFolder — Server Action entry point for FR-1 CSV ingestion.
 *
 * Scans `${dataDir}/raw/*.csv`, parses each file via parseCsv,
 * routes valid rows through ingestTransactions, persists via upsertTransactions,
 * logs file-level parse failures.
 *
 * REQ-CSV-1: folder scan with dataDir override + BUNKER_DATA_DIR default.
 * REQ-CSV-3: file-level skip logged to ingest.log.
 * REQ-CSV-5: returns IngestResult.
 * REQ-STORE-1/2/3: persisted with schemaVersion:1, idempotent upsert.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseCsvAdaptive } from '@/lib/engine/parseCsvAdaptive';
import { ingestTransactions } from '@/lib/engine/ingestTransactions';
import { readStore, upsertTransactions } from '@/lib/engine/store';
import { appendIngestLog } from '@/lib/engine/logger';
import { resolveDataDir, resolveOwnerId } from '@/lib/engine/env';
import type { IngestResult } from '@/lib/types/ingest';

export async function ingestFromFolder(input?: {
  ownerId?: string;
  dataDir?: string;
}): Promise<IngestResult> {
  const ownerId = input?.ownerId ?? resolveOwnerId();
  const dataDir = input?.dataDir ?? resolveDataDir();
  const rawDir = path.join(dataDir, 'raw');
  const stateDir = path.join(dataDir, 'state');
  const logPath = path.join(stateDir, 'ingest.log');

  await fs.mkdir(stateDir, { recursive: true });

  let skipped = 0;

  let files: string[] = [];
  try {
    files = await fs.readdir(rawDir);
  } catch {
    // raw dir doesn't exist — nothing to ingest
    return { ingested: 0, deduped: 0, skipped: 0, logPath, transactionCount: 0 };
  }

  const csvFiles = files.filter((f) => f.endsWith('.csv'));

  // Accumulate all candidates before a single upsert (per-owner batch)
  const allCandidates: Awaited<ReturnType<typeof ingestTransactions>> = [];

  for (const file of csvFiles) {
    const filePath = path.join(rawDir, file);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch {
      await appendIngestLog(stateDir, { kind: 'skip', file, line: 0, reason: 'file-unreadable' });
      skipped += 1;
      continue;
    }

    let rows: Awaited<ReturnType<typeof parseCsvAdaptive>> = [];
    try {
      rows = parseCsvAdaptive(raw);
    } catch {
      await appendIngestLog(stateDir, {
        kind: 'skip',
        file,
        line: 0,
        reason: 'parse-error',
      });
      skipped += 1;
      continue;
    }

    const txns = ingestTransactions(rows, ownerId, filePath);
    allCandidates.push(...txns);
  }

  // Persist all candidates in one upsert (per-owner, per-run)
  const { added, skipped: deduped } = await upsertTransactions(dataDir, ownerId, allCandidates);

  const transactionCount = (await readStore(dataDir, ownerId)).length;

  return { ingested: added, deduped, skipped, logPath, transactionCount };
}
