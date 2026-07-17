import { describe, it, expect } from 'vitest';
import { ingestTransactions } from '@/lib/engine/ingestTransactions';
import { parseCsv } from '@/lib/engine/parseCsv';

describe('ingestTransactions', () => {
  it('given rows from parseCsv → returns same-length array of Transaction', () => {
    const csv = `Date,Description,Amount
2026-03-01,GLOVO *Order#123,-42
2026-03-02,Netflix subscription,-15.99
2026-03-03,Salary deposit,3500.00`;
    const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
    const ownerId = 'self';
    const sourceFile = '/data/raw/march.csv';
    const result = ingestTransactions(rows, ownerId, sourceFile);

    expect(result).toHaveLength(3);
    const [tx1, tx2, tx3] = result;
    expect(tx1!.date).toBe('2026-03-01');
    expect(tx2!.date).toBe('2026-03-02');
    expect(tx3!.date).toBe('2026-03-03');
  });

  it('id is non-empty hex string (64 chars for SHA-256)', () => {
    const csv = `Date,Description,Amount
2026-03-01,Test,-10.00`;
    const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
    const result = ingestTransactions(rows, 'self', '/x.csv');
    expect(result[0]!.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('cleanedDescription is normalized via cleanDescription', () => {
    const csv1 = `Date,Description,Amount
2026-03-01,GLOVO *Order#123,-42`;
    const csv2 = `Date,Description,Amount
2026-03-01,GLOVO   *order # 123,-42`;
    const rows1 = parseCsv(csv1, { dateFormat: 'YYYY-MM-DD' });
    const rows2 = parseCsv(csv2, { dateFormat: 'YYYY-MM-DD' });
    const r1 = ingestTransactions(rows1, 'self', '/a.csv');
    const r2 = ingestTransactions(rows2, 'self', '/b.csv');
    expect(r1[0]!.cleanedDescription).toBe(r2[0]!.cleanedDescription);
  });

  it('category matches classify(amount)', () => {
    const csvNeg = `Date,Description,Amount\n2026-03-01,Test,-10.00`;
    const csvPos = `Date,Description,Amount\n2026-03-01,Test,5000.00`;
    const negRows = parseCsv(csvNeg, { dateFormat: 'YYYY-MM-DD' });
    const posRows = parseCsv(csvPos, { dateFormat: 'YYYY-MM-DD' });
    const negResult = ingestTransactions(negRows, 'self', '/a.csv');
    const posResult = ingestTransactions(posRows, 'self', '/b.csv');
    expect(negResult[0]!.category.tier).toBe('wants'); // negative → wants
    expect(posResult[0]!.category.tier).toBe('income'); // positive → income
  });

  it('ownerId is the passed parameter', () => {
    const csv = `Date,Description,Amount\n2026-03-01,Test,-10`;
    const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
    const result = ingestTransactions(rows, 'partner-42', '/x.csv');
    expect(result[0]!.ownerId).toBe('partner-42');
  });

  it('sourceFile is the passed parameter', () => {
    const csv = `Date,Description,Amount\n2026-03-01,Test,-10`;
    const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
    const result = ingestTransactions(rows, 'self', '/data/raw/april.csv');
    expect(result[0]!.sourceFile).toBe('/data/raw/april.csv');
  });

  it('firstSeenAt is a parseable ISO-8601 datetime string', () => {
    const csv = `Date,Description,Amount\n2026-03-01,Test,-10`;
    const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
    const result = ingestTransactions(rows, 'self', '/x.csv');
    const firstSeen = result[0]!.firstSeenAt;
    expect(() => new Date(firstSeen)).not.toThrow();
    expect(firstSeen).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('empty rows → returns empty array', () => {
    const result = ingestTransactions([], 'self', '/x.csv');
    expect(result).toHaveLength(0);
  });

  it('id is deterministic: same input → same id', () => {
    const csv = `Date,Description,Amount\n2026-03-01,Netflix subscription,-15.99`;
    const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
    const r1 = ingestTransactions(rows, 'self', '/x.csv');
    const r2 = ingestTransactions(rows, 'self', '/x.csv');
    expect(r1[0]!.id).toBe(r2[0]!.id);
  });
});
