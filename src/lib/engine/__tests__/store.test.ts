import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { readStore, upsertTransactions } from '@/lib/engine/store';
import { ingestTransactions } from '@/lib/engine/ingestTransactions';
import { parseCsv } from '@/lib/engine/parseCsv';
import type { Transaction } from '@/lib/types/transaction';

// Helper: create 5 deterministic transactions for ownerId='self'
function fiveSelfTransactions(sourceFile: string): Transaction[] {
  const csv = `Date,Description,Amount
2026-03-01,Glovo Order#123,-42.00
2026-03-02,Netflix subscription,-15.99
2026-03-03,SALARY DEPOSIT,3500.00
2026-03-04,Amazon Purchase,-89.50
2026-03-05,STARBUCKS    *coffee,-6.80`;
  const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
  return ingestTransactions(rows, 'self', sourceFile);
}

describe('store — T-6 round-trip', () => {
  const dataDir = path.join(os.tmpdir(), 'bkr-test-store-t6');

  beforeEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it('readStore on empty store (no file yet) → returns []', async () => {
    const result = await readStore(dataDir, 'self');
    expect(result).toEqual([]);
  });

  it('readStore on missing dir/file → returns [] without creating anything', async () => {
    // dataDir was removed in beforeEach — neither dir nor file exists.
    const result = await readStore(dataDir, 'self');
    expect(result).toEqual([]);

    // readStore must NOT have created the state dir or the store file.
    const stateDir = path.join(dataDir, 'state');
    const storePath = path.join(stateDir, 'transactions.json');
    await expect(fs.access(stateDir)).rejects.toThrow();
    await expect(fs.access(storePath)).rejects.toThrow();
  });

  it('readStore on missing parent dir → returns [] without throwing (regression: EACCES on /data)', async () => {
    // Use a deeply nested path where no ancestor exists — simulates the
    // original bug where readStore tried to mkdir on an unwritable parent.
    const missingParent = path.join(
      os.tmpdir(),
      'bkr-test-store-missing-parent',
      String(Date.now()),
      'nested',
    );
    // Sanity: nothing at this path yet.
    await expect(fs.access(missingParent)).rejects.toThrow();

    const result = await readStore(missingParent, 'self');
    expect(result).toEqual([]);

    // Still nothing created.
    await expect(fs.access(missingParent)).rejects.toThrow();
  });

  it('upsertTransactions still auto-creates dir/file on first write', async () => {
    // dataDir was removed in beforeEach.
    const txns = fiveSelfTransactions('/data/raw/march.csv');
    const { added, skipped } = await upsertTransactions(dataDir, 'self', txns);
    expect(added).toBe(5);
    expect(skipped).toBe(0);

    // The state dir and file must now exist.
    const storePath = path.join(dataDir, 'state', 'transactions.json');
    const raw = await fs.readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.owners.self).toHaveLength(5);

    // And readStore now returns the inserted transactions.
    const stored = await readStore(dataDir, 'self');
    expect(stored).toHaveLength(5);
  });

  it('insert 5 transactions → readStore returns 5', async () => {
    const txns = fiveSelfTransactions('/data/raw/march.csv');
    const { added, skipped } = await upsertTransactions(dataDir, 'self', txns);
    expect(added).toBe(5);
    expect(skipped).toBe(0);

    const stored = await readStore(dataDir, 'self');
    expect(stored).toHaveLength(5);
  });

  it('re-insert same 5 (by id) → returns added:0, skipped:5 (strict idempotency)', async () => {
    const txns = fiveSelfTransactions('/data/raw/march.csv');
    await upsertTransactions(dataDir, 'self', txns);

    const { added, skipped } = await upsertTransactions(dataDir, 'self', txns);
    expect(added).toBe(0);
    expect(skipped).toBe(5);

    const stored = await readStore(dataDir, 'self');
    expect(stored).toHaveLength(5);
  });

  it('insert 5, then insert 3 new + 2 already-present → added:3, skipped:2', async () => {
    // First batch: 5
    const batch1 = fiveSelfTransactions('/data/raw/march.csv');
    await upsertTransactions(dataDir, 'self', batch1);

    // Second batch: same 5 + 3 new
    const newCsv = `Date,Description,Amount
2026-03-01,Glovo Order#123,-42.00
2026-03-02,Netflix subscription,-15.99
2026-03-03,SALARY DEPOSIT,3500.00
2026-03-04,Amazon Purchase,-89.50
2026-03-05,STARBUCKS    *coffee,-6.80
2026-04-01,New Merchant One,-25.00
2026-04-02,Another New Purchase,-33.00
2026-04-03,Yet Another Transaction,-10.00`;
    const rows2 = parseCsv(newCsv, { dateFormat: 'YYYY-MM-DD' });
    const batch2 = ingestTransactions(rows2, 'self', '/data/raw/april.csv');

    const { added, skipped } = await upsertTransactions(dataDir, 'self', batch2);
    expect(added).toBe(3);
    expect(skipped).toBe(5);

    const stored = await readStore(dataDir, 'self');
    expect(stored).toHaveLength(8);
  });

  it('different owner self vs other → independent arrays', async () => {
    // self ingests their own CSV
    const selfCsv = fiveSelfTransactions('/data/raw/self-march.csv');
    await upsertTransactions(dataDir, 'self', selfCsv);

    // other ingests a DIFFERENT CSV (different amounts → different IDs)
    // They have overlapping descriptions but different amounts → still different IDs
    const otherCsv = `Date,Description,Amount
2026-03-01,Glovo Order#123,-99.00
2026-03-02,Netflix subscription,-25.00
2026-03-03,SALARY DEPOSIT,5500.00
2026-03-04,Amazon Purchase,-120.00
2026-03-05,STARBUCKS    *coffee,-12.00`;
    const otherRows = parseCsv(otherCsv, { dateFormat: 'YYYY-MM-DD' });
    const otherTxns = ingestTransactions(otherRows, 'other', '/data/raw/other-march.csv');
    await upsertTransactions(dataDir, 'other', otherTxns);

    const selfStored = await readStore(dataDir, 'self');
    const otherStored = await readStore(dataDir, 'other');
    expect(selfStored).toHaveLength(5);
    expect(otherStored).toHaveLength(5);
    // Each owner's array has the correct ownerId baked in
    expect(selfStored[0]!.ownerId).toBe('self');
    expect(otherStored[0]!.ownerId).toBe('other');
    // IDs are different (different amounts → different hashes)
    expect(selfStored[0]!.id).not.toBe(otherStored[0]!.id);
  });

  it('existing store without schemaVersion field → throw with explicit message', async () => {
    const storeDir = path.join(dataDir, 'state');
    await fs.mkdir(storeDir, { recursive: true });
    const storePath = path.join(storeDir, 'transactions.json');
    // Write a malformed store without schemaVersion
    await fs.writeFile(storePath, JSON.stringify({ owners: { self: [] } }), 'utf8');

    await expect(readStore(dataDir, 'self')).rejects.toThrow(/schemaVersion mismatch, expected 1/);
  });

  it('firstSeenAt is preserved across re-ingestion (not overwritten)', async () => {
    const txns = fiveSelfTransactions('/data/raw/march.csv');
    await upsertTransactions(dataDir, 'self', txns);

    // Wait a tiny bit so firstSeenAt would differ if rewritten
    await new Promise((r) => setTimeout(r, 50));

    const storedBefore = await readStore(dataDir, 'self');
    const firstSeenBefore = storedBefore[0]!.firstSeenAt;

    await upsertTransactions(dataDir, 'self', txns);

    const storedAfter = await readStore(dataDir, 'self');
    expect(storedAfter[0]!.firstSeenAt).toBe(firstSeenBefore);
  });
});
