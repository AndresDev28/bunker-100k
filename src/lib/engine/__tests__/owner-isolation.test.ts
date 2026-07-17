import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { readStore, upsertTransactions } from '@/lib/engine/store';
import { ingestTransactions } from '@/lib/engine/ingestTransactions';
import { parseCsv } from '@/lib/engine/parseCsv';

/**
 * T-8: Owner isolation.
 *
 * Scenarios:
 * 1. Two owners ingest the SAME logical CSV (same rows → same hashes).
 *    Each owner gets their own independent array.
 * 2. After owner 'self' upserts 3 additional transactions, 'other' is unchanged.
 * 3. Concurrent upserts via Promise.all — no data loss, no cross-owner contamination.
 * 4. Read after concurrent writes — each owner reads back exactly what they wrote.
 */
describe('owner isolation — T-8', () => {
  const dataDir = path.join(os.tmpdir(), 'bkr-test-owner-isolation');

  beforeEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('self + other ingest same logical CSV → each gets own array (hash collision across owners is allowed)', async () => {
    // Both owners ingest the SAME raw CSV data
    const csv = `Date,Description,Amount
2026-03-01,Glovo Order#123,-42.00
2026-03-02,Netflix subscription,-15.99
2026-03-03,SALARY DEPOSIT,3500.00`;
    const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });

    const selfTxns = ingestTransactions(rows, 'self', '/data/raw/march.csv');
    const otherTxns = ingestTransactions(rows, 'other', '/data/raw/march.csv');

    await upsertTransactions(dataDir, 'self', selfTxns);
    await upsertTransactions(dataDir, 'other', otherTxns);

    const selfStored = await readStore(dataDir, 'self');
    const otherStored = await readStore(dataDir, 'other');

    // Each owner has 3 transactions
    expect(selfStored).toHaveLength(3);
    expect(otherStored).toHaveLength(3);

    // Each transaction is owned by the correct ownerId
    for (const t of selfStored) {
      expect(t.ownerId).toBe('self');
    }
    for (const t of otherStored) {
      expect(t.ownerId).toBe('other');
    }

    // Same logical data → same IDs (hash collision across owners IS allowed —
    // each owner stores their own copy)
    expect(selfStored[0]!.id).toBe(otherStored[0]!.id);
  });

  it('self upserts 3 additional transactions; other remains unchanged', async () => {
    // Both start with the same 3 rows
    const csv1 = `Date,Description,Amount
2026-03-01,A,-10
2026-03-02,B,-20
2026-03-03,C,-30`;
    const rows1 = parseCsv(csv1, { dateFormat: 'YYYY-MM-DD' });
    const selfBase = ingestTransactions(rows1, 'self', '/data/raw/base.csv');
    const otherBase = ingestTransactions(rows1, 'other', '/data/raw/base.csv');

    await upsertTransactions(dataDir, 'self', selfBase);
    await upsertTransactions(dataDir, 'other', otherBase);

    // self adds 3 more
    const csv2 = `Date,Description,Amount
2026-04-01,D,-40
2026-04-02,E,-50
2026-04-03,F,-60`;
    const rows2 = parseCsv(csv2, { dateFormat: 'YYYY-MM-DD' });
    const selfExtra = ingestTransactions(rows2, 'self', '/data/raw/extra.csv');
    await upsertTransactions(dataDir, 'self', selfExtra);

    const selfStored = await readStore(dataDir, 'self');
    const otherStored = await readStore(dataDir, 'other');

    expect(selfStored).toHaveLength(6); // 3 base + 3 extra
    expect(otherStored).toHaveLength(3); // unchanged
  });

  it('concurrent upserts via Promise.all — no data loss, no cross-owner contamination', async () => {
    const csv = `Date,Description,Amount
2026-03-01,X,-10
2026-03-02,Y,-20`;
    const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });

    const selfTxns = ingestTransactions(rows, 'self', '/data/raw/concurrent.csv');
    const otherTxns = ingestTransactions(rows, 'other', '/data/raw/concurrent.csv');

    // Fire both upserts concurrently
    await Promise.all([
      upsertTransactions(dataDir, 'self', selfTxns),
      upsertTransactions(dataDir, 'other', otherTxns),
    ]);

    const selfStored = await readStore(dataDir, 'self');
    const otherStored = await readStore(dataDir, 'other');

    // Both got their full 2 transactions — no data loss
    expect(selfStored).toHaveLength(2);
    expect(otherStored).toHaveLength(2);

    // Correct ownerId on each
    for (const t of selfStored) expect(t.ownerId).toBe('self');
    for (const t of otherStored) expect(t.ownerId).toBe('other');
  });

  it('read after concurrent writes — each owner reads back exactly what they wrote', async () => {
    const csvSelf = `Date,Description,Amount
2026-03-01,SELF-A,-100
2026-03-02,SELF-B,-200`;
    const csvOther = `Date,Description,Amount
2026-03-01,OTHER-X,-1000
2026-03-02,OTHER-Y,-2000`;

    const selfRows = parseCsv(csvSelf, { dateFormat: 'YYYY-MM-DD' });
    const otherRows = parseCsv(csvOther, { dateFormat: 'YYYY-MM-DD' });
    const selfTxns = ingestTransactions(selfRows, 'self', '/data/raw/self.csv');
    const otherTxns = ingestTransactions(otherRows, 'other', '/data/raw/other.csv');

    const [selfResult, otherResult] = await Promise.all([
      upsertTransactions(dataDir, 'self', selfTxns),
      upsertTransactions(dataDir, 'other', otherTxns),
    ]);

    expect(selfResult.added).toBe(2);
    expect(otherResult.added).toBe(2);

    // Read after concurrent writes
    const [selfStored, otherStored] = await Promise.all([
      readStore(dataDir, 'self'),
      readStore(dataDir, 'other'),
    ]);

    expect(selfStored).toHaveLength(2);
    expect(otherStored).toHaveLength(2);

    // No empty arrays, no swapped data
    const selfIds = new Set(selfStored.map((t) => t.id));
    const otherIds = new Set(otherStored.map((t) => t.id));
    expect(selfIds.has(otherStored[0]!.id)).toBe(false);
    expect(otherIds.has(selfStored[0]!.id)).toBe(false);
  });
});
