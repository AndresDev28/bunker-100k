/**
 * Strict-TDD tests for loadTransactions Server Action (REQ-READ-1..3).
 *
 * Pattern mirrors ingest-from-folder.test.ts: tmpdir setup, write via
 * upsertTransactions, then call loadTransactions and assert.
 *
 * Named blocks per spec §4:
 *   - 'returns persisted transactions for ownerId=self'
 *   - 'returns [] for a missing owner without throwing'
 *   - 'shares resolveDataDir/resolveOwnerId with ingestFromFolder — same data dir'
 *   - 'honors input.dataDir override for tests'
 */
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { upsertTransactions } from '@/lib/engine/store';
import { ingestTransactions } from '@/lib/engine/ingestTransactions';
import { parseCsv } from '@/lib/engine/parseCsv';
import { resolveDataDir, resolveOwnerId } from '@/lib/engine/env';
import { loadTransactions } from '@/app/actions/loadTransactions';

function makeSelfTxns(sourceFile: string) {
  const csv = `Date,Description,Amount
2026-03-01,Glovo Order,-42.00
2026-03-02,Netflix,-15.99
2026-03-03,SALARY,3500.00
2026-03-04,Amazon,-89.50
2026-03-05,STARBUCKS,-6.80`;
  const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
  return ingestTransactions(rows, 'self', sourceFile);
}

describe('read action: loadTransactions', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'load-txns-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns persisted transactions for ownerId=self', async () => {
    const txns = makeSelfTxns('/data/raw/march.csv');
    await upsertTransactions(tmpDir, 'self', txns);

    const result = await loadTransactions({ dataDir: tmpDir });

    expect(result).toHaveLength(5);
    expect(result[0]!.ownerId).toBe('self');
  });

  it('returns [] for a missing owner without throwing', async () => {
    // Write a store with 'self' only, then read 'partner'
    const txns = makeSelfTxns('/data/raw/march.csv');
    await upsertTransactions(tmpDir, 'self', txns);

    const result = await loadTransactions({ dataDir: tmpDir, ownerId: 'partner' });

    expect(result).toEqual([]);
  });

  it('shares resolveDataDir/resolveOwnerId with ingestFromFolder — same data dir', async () => {
    // Verify the helpers are the same ones used by both actions.
    // This is a structural assertion: loadTransactions MUST consume the
    // shared env helpers, not inline resolution.
    expect(typeof resolveDataDir).toBe('function');
    expect(typeof resolveOwnerId).toBe('function');
    expect(resolveOwnerId()).toBe('self');

    // Functional proof: when env override is set, loadTransactions() with no
    // input uses the same dir as ingestFromFolder would.
    const prev = process.env.BUNKER_DATA_DIR;
    process.env.BUNKER_DATA_DIR = tmpDir;
    try {
      const txns = makeSelfTxns('/data/raw/march.csv');
      await upsertTransactions(tmpDir, 'self', txns);

      // No input — uses env helpers
      const result = await loadTransactions();
      expect(result).toHaveLength(5);
    } finally {
      if (prev === undefined) {
        delete process.env.BUNKER_DATA_DIR;
      } else {
        process.env.BUNKER_DATA_DIR = prev;
      }
    }
  });

  it('honors input.dataDir override for tests', async () => {
    const txns = makeSelfTxns('/data/raw/march.csv');
    await upsertTransactions(tmpDir, 'self', txns);

    // Override dataDir explicitly
    const result = await loadTransactions({ dataDir: tmpDir, ownerId: 'self' });
    expect(result).toHaveLength(5);

    // Override ownerId explicitly
    const result2 = await loadTransactions({ dataDir: tmpDir, ownerId: 'nonexistent' });
    expect(result2).toEqual([]);
  });
});
