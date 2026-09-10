/**
 * T-9: browser-upload Server Action tests (REQ-CSV-6).
 *
 * Mirrors the T-5 `ingestFromFolder` fixture style: a real temp data dir plus a
 * real store round-trip. Deliberately NOT mocking `parseCsv` /
 * `ingestTransactions` / `upsertTransactions` — rule 4 of REQ-CSV-6 is dedup
 * PARITY with `ingestFromFolder`, and a mocked store cannot prove parity.
 *
 * `ingestFromUpload` takes only a `FormData` (spec §3), so test isolation runs
 * through `BUNKER_DATA_DIR`, which is also what makes the canonical `logPath`
 * invariant (rule 3) observable.
 */
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ingestFromUpload } from '@/app/actions/ingestFromUpload';

const VALID_3_ROWS = `Date,Description,Amount
2026-03-01,Netflix subscription,-15.99
2026-03-02,Glovo order,-23.50
2026-03-03,Salary deposit,3500.00`;

const VALID_2_ROWS = `Date,Description,Amount
2026-04-01,Groceries market,-64.20
2026-04-02,Utilities bill,-88.10`;

// parseCsv is all-or-nothing per file: a row missing Amount throws, so the
// whole file is skipped and logged (same contract as ingestFromFolder).
const MALFORMED = `Date,Description,Amount
2026-05-01,Broken row,`;

function csvFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/csv' });
}

function formDataWith(...files: readonly File[]): FormData {
  const fd = new FormData();
  for (const file of files) fd.append('files', file);
  return fd;
}

describe('ingestFromUpload (REQ-CSV-6)', () => {
  let tmpDir: string;
  let previousDataDir: string | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ingest-upload-test-'));
    previousDataDir = process.env.BUNKER_DATA_DIR;
    process.env.BUNKER_DATA_DIR = tmpDir;
  });

  afterEach(async () => {
    if (previousDataDir === undefined) delete process.env.BUNKER_DATA_DIR;
    else process.env.BUNKER_DATA_DIR = previousDataDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('happy path — a single 3-row CSV into an empty store', async () => {
    const result = await ingestFromUpload(formDataWith(csvFile('march.csv', VALID_3_ROWS)));

    expect(result.ingested).toBe(3);
    expect(result.deduped).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.transactionCount).toBe(3);
  });

  it('multi-file dispatch — two CSVs in one FormData aggregate into one result', async () => {
    const result = await ingestFromUpload(
      formDataWith(csvFile('march.csv', VALID_3_ROWS), csvFile('april.csv', VALID_2_ROWS)),
    );

    expect(result.ingested).toBe(5);
    expect(result.deduped).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.transactionCount).toBe(5);
  });

  it('no files in the FormData — returns zero counts without throwing', async () => {
    const result = await ingestFromUpload(new FormData());

    expect(result).toMatchObject({
      ingested: 0,
      deduped: 0,
      skipped: 0,
      transactionCount: 0,
    });
  });

  it('an empty file — returns zero counts without throwing', async () => {
    const result = await ingestFromUpload(formDataWith(csvFile('empty.csv', '')));

    expect(result).toMatchObject({
      ingested: 0,
      deduped: 0,
      skipped: 0,
      transactionCount: 0,
    });
  });

  it('malformed CSV — skipped is incremented, logged, and valid files still ingest', async () => {
    const result = await ingestFromUpload(
      formDataWith(csvFile('broken.csv', MALFORMED), csvFile('march.csv', VALID_3_ROWS)),
    );

    expect(result.skipped).toBeGreaterThan(0);
    // The healthy file in the same batch is unaffected.
    expect(result.ingested).toBe(3);
    expect(result.transactionCount).toBe(3);

    const log = await fs.readFile(path.join(tmpDir, 'state', 'ingest.log'), 'utf8');
    const entries = log
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { kind: string; file: string; reason: string });

    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]!.kind).toBe('skip');
    expect(entries[0]!.file).toBe('broken.csv');
  });

  it('dedup parity — re-uploading the same CSV ingests nothing and dedups all rows', async () => {
    const first = await ingestFromUpload(formDataWith(csvFile('march.csv', VALID_3_ROWS)));
    expect(first.ingested).toBe(3);

    const second = await ingestFromUpload(formDataWith(csvFile('march.csv', VALID_3_ROWS)));

    expect(second.ingested).toBe(0);
    expect(second.deduped).toBe(3);
    expect(second.skipped).toBe(0);
    expect(second.transactionCount).toBe(3);
  });

  it('logPath is always resolveDataDir()/state/ingest.log — never derived from a filename', async () => {
    const canonical = path.join(tmpDir, 'state', 'ingest.log');

    const withFile = await ingestFromUpload(formDataWith(csvFile('weird-name.csv', VALID_3_ROWS)));
    const withoutFiles = await ingestFromUpload(new FormData());

    expect(withFile.logPath).toBe(canonical);
    expect(withoutFiles.logPath).toBe(canonical);
    expect(withFile.logPath).not.toContain('weird-name');
  });
});
