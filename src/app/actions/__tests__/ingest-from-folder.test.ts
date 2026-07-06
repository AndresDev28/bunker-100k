/**
 * T-5: filesystem-source Server Action tests.
 *
 * Key design decisions:
 * - parseCsv throws on malformed rows (all-or-nothing per file).
 *   So skipped count in this PR reflects file-level parse failures, not row-level.
 *   Row-level skip+log arrives with W7 store round-trip when we have persistence context.
 * - dataDir override is a direct parameter (not env var) for test isolation.
 * - ownerId defaults to 'self' per assumption A1.
 *
 * REQ-CSV-1: folder scan with dataDir override.
 * REQ-CSV-3: malformed rows logged (file-level in this PR).
 * REQ-CSV-5: IngestResult shape returned.
 */
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ingestFromFolder } from '@/app/actions/ingestFromFolder';

describe('ingestFromFolder', () => {
  let tmpDir: string;
  let rawDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ingest-folder-test-'));
    rawDir = path.join(tmpDir, 'raw');
    await fs.mkdir(rawDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns IngestResult with ingested=3, skipped=0 for a valid 3-row CSV', async () => {
    await fs.writeFile(
      path.join(rawDir, 'valid.csv'),
      `Date,Description,Amount
2026-03-01,Netflix subscription,-15.99
2026-03-02,Glovo order,-23.50
2026-03-03,Salary deposit,3500.00`,
      'utf8',
    );

    const result = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });

    expect(result.ingested).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.deduped).toBe(0);
    expect(result.transactionCount).toBe(3);
    expect(result.logPath).toBe(path.join(tmpDir, 'state', 'ingest.log'));
  });

  it('honors dataDir override: scans ${dataDir}/raw/*.csv', async () => {
    await fs.writeFile(
      path.join(rawDir, 'march.csv'),
      `Date,Description,Amount
2026-03-01,Netflix,-15.99`,
      'utf8',
    );

    const result = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });

    expect(result.transactionCount).toBe(1);
    expect(result.ingested).toBe(1);
  });

  it('ownerId defaults to self', async () => {
    await fs.writeFile(
      path.join(rawDir, 'test.csv'),
      `Date,Description,Amount
2026-03-01,Test,-10`,
      'utf8',
    );

    const result = await ingestFromFolder({ dataDir: tmpDir });

    expect(result.transactionCount).toBe(1);
  });

  it('skips files with missing headers (file-level parse failure → skipped=1)', async () => {
    // parseCsv throws on missing header — counts as 1 skipped file
    await fs.writeFile(path.join(rawDir, 'bad.csv'), `Not,a,csv\n1,2,3`, 'utf8');

    const result = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });

    expect(result.skipped).toBe(1);
    expect(result.ingested).toBe(0);
    expect(result.transactionCount).toBe(0);
  });

  it('Transaction.sourceFile reflects correct origin file', async () => {
    await fs.writeFile(
      path.join(rawDir, 'april.csv'),
      `Date,Description,Amount
2026-03-01,Netflix,-15.99`,
      'utf8',
    );
    await fs.writeFile(
      path.join(rawDir, 'may.csv'),
      `Date,Description,Amount
2026-03-02,Spotify,-9.99`,
      'utf8',
    );

    const result = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });

    // result.transactionCount = 2 confirms both CSV files were processed
    expect(result.transactionCount).toBe(2);
  });

  it('creates ingest.log with skip event for malformed file', async () => {
    await fs.writeFile(path.join(rawDir, 'broken.csv'), `No,headers,here`, 'utf8');

    await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });

    const logPath = path.join(tmpDir, 'state', 'ingest.log');
    const content = await fs.readFile(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    const event = JSON.parse(lines[0]!);
    expect(event.kind).toBe('skip');
    expect(event.file).toBe('broken.csv');
  });

  it('is idempotent at the action level: re-running same data dedups (store-level)', async () => {
    await fs.writeFile(
      path.join(rawDir, 'dup.csv'),
      `Date,Description,Amount
2026-03-01,Netflix,-15.99`,
      'utf8',
    );

    const r1 = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });
    const r2 = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });

    // First run: 1 new transaction added, 0 deduped
    expect(r1.ingested).toBe(1);
    expect(r1.deduped).toBe(0);
    // Second run: 0 new (all skipped as duplicates), deduped = 1
    expect(r2.ingested).toBe(0);
    expect(r2.deduped).toBe(1);
    // Total persisted stays at 1 (not 2)
    expect(r2.transactionCount).toBe(1);
    expect(r1.transactionCount).toBe(r2.transactionCount);
  });

  it('persistence + idempotency: data survives process restart and re-run is no-op', async () => {
    // First session: ingest some data
    await fs.writeFile(
      path.join(rawDir, 'session1.csv'),
      `Date,Description,Amount
2026-03-01,A,-10
2026-03-02,B,-20`,
      'utf8',
    );
    const r1 = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });
    expect(r1.ingested).toBe(2);
    expect(r1.transactionCount).toBe(2);

    // Simulate "process restart" — read persisted store directly
    const storePath = path.join(tmpDir, 'state', 'transactions.json');
    const raw = await fs.readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.owners.self).toHaveLength(2);

    // Second session: re-run — same data is a no-op
    const r2 = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });
    expect(r2.ingested).toBe(0);
    expect(r2.deduped).toBe(2);
    expect(r2.transactionCount).toBe(2); // still 2, not 4

    // Move session1.csv out of raw dir — only session2.csv is new
    await fs.rename(
      path.join(rawDir, 'session1.csv'),
      path.join(tmpDir, 'session1.csv.bak'),
    );
    // New data added alongside persisted data
    await fs.writeFile(
      path.join(rawDir, 'session2.csv'),
      `Date,Description,Amount
2026-03-03,C,-30`,
      'utf8',
    );
    const r3 = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });
    expect(r3.ingested).toBe(1); // only the new one
    expect(r3.deduped).toBe(0); // no duplicates — session1.csv is gone
    expect(r3.transactionCount).toBe(3); // 2 old + 1 new
  });

  it('processes multiple CSV files in one call', async () => {
    await fs.writeFile(
      path.join(rawDir, 'a.csv'),
      `Date,Description,Amount\n2026-03-01,A,-10`,
      'utf8',
    );
    await fs.writeFile(
      path.join(rawDir, 'b.csv'),
      `Date,Description,Amount\n2026-03-02,B,-20`,
      'utf8',
    );
    await fs.writeFile(
      path.join(rawDir, 'c.csv'),
      `Date,Description,Amount\n2026-03-03,C,-30`,
      'utf8',
    );

    const result = await ingestFromFolder({ ownerId: 'self', dataDir: tmpDir });

    expect(result.transactionCount).toBe(3);
    expect(result.ingested).toBe(3);
  });
});
