'use server';
/**
 * ingestFromFolder — Server Action entry point for FR-1 CSV ingestion.
 *
 * Scans `${dataDir}/raw/*.csv`, parses each file via parseCsv,
 * routes valid rows through ingestTransactions, logs file-level parse failures.
 *
 * parseCsv throws on malformed rows (all-or-nothing per file).
 * Row-level skip+log is W7 (persistence context needed to detect duplicates).
 *
 * REQ-CSV-1: folder scan with dataDir override + BUNKER_DATA_DIR default.
 * REQ-CSV-3: file-level skip logged to ingest.log.
 * REQ-CSV-5: returns IngestResult.
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parseCsv } from '@/lib/engine/parseCsv';
import { ingestTransactions } from '@/lib/engine/ingestTransactions';
import { appendIngestLog } from '@/lib/engine/logger';
import type { IngestResult } from '@/lib/types/ingest';

export async function ingestFromFolder(input?: {
  ownerId?: string;
  dataDir?: string;
}): Promise<IngestResult> {
  const ownerId = input?.ownerId ?? 'self';
  const dataDir = input?.dataDir ?? process.env.BUNKER_DATA_DIR ?? '/data';
  const rawDir = path.join(dataDir, 'raw');
  const stateDir = path.join(dataDir, 'state');
  const logPath = path.join(stateDir, 'ingest.log');

  await fs.mkdir(stateDir, { recursive: true });

  let ingested = 0;
  let skipped = 0;
  const deduped = 0; // store-level dedup arrives W7
  let transactionCount = 0;

  let files: string[] = [];
  try {
    files = await fs.readdir(rawDir);
  } catch {
    // raw dir doesn't exist — nothing to ingest
    return { ingested: 0, deduped: 0, skipped: 0, logPath, transactionCount: 0 };
  }

  const csvFiles = files.filter((f) => f.endsWith('.csv'));

  for (const file of csvFiles) {
    const filePath = path.join(rawDir, file);
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch {
      // unreadable file — skip with event
      await appendIngestLog(stateDir, { kind: 'skip', file, line: 0, reason: 'file-unreadable' });
      skipped += 1;
      continue;
    }

    let rows: Awaited<ReturnType<typeof parseCsv>> = [];
    try {
      rows = parseCsv(raw);
    } catch {
      // parseCsv throws on malformed rows (all-or-nothing per file).
      // Row-level skip arrives in W7 when we have store context.
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
    ingested += txns.length;
    transactionCount += txns.length;
  }

  return { ingested, deduped, skipped, logPath, transactionCount };
}
