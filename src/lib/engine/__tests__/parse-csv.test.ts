import { describe, it, expect } from 'vitest';
import { parseCsv } from '@/lib/engine/parseCsv';

describe('parseCsv', () => {
  describe('header detection', () => {
    it('standard header "Date,Description,Amount" → parses 3-row CSV to 3 rows', () => {
      const csv = `Date,Description,Amount
2026-03-01,Netflix subscription,-15.99
2026-03-02,Glovo order,-23.50
2026-03-03,Salary deposit,3500.00`;
      const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
      expect(rows).toHaveLength(3);
      expect(rows[0]!.date).toBe('2026-03-01');
      expect(rows[0]!.description).toBe('Netflix subscription');
      expect(rows[0]!.amount).toBe(-15.99);
    });

    it('lower-case header "date,description,amount" → parses (case-insensitive)', () => {
      const csv = `date,description,amount
2026-03-01,Netflix subscription,-15.99
2026-03-02,Glovo order,-23.50`;
      const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
      expect(rows).toHaveLength(2);
      expect(rows[0]!.date).toBe('2026-03-01');
      expect(rows[1]!.amount).toBe(-23.5);
    });
  });

  describe('currency strip', () => {
    it('"-€42,50" → -42.50 (ES locale: . thousands, , decimal)', () => {
      // Amount must be quoted since it contains a comma (decimal separator in ES)
      const csv = `Date,Description,Amount
2026-03-01,Test,"-€42,50"`;
      const rows = parseCsv(csv, { locale: 'ES', dateFormat: 'YYYY-MM-DD' });
      expect(rows[0]!.amount).toBe(-42.5);
    });

    it('"$1,234.56" → 1234.56 (EN locale: , thousands, . decimal)', () => {
      const csv = `Date,Description,Amount
2026-03-01,Test,"$1,234.56"`;
      const rows = parseCsv(csv, { locale: 'EN', dateFormat: 'YYYY-MM-DD' });
      expect(rows[0]!.amount).toBe(1234.56);
    });

    it('"€42.00" → 42.00 (EUR no sign)', () => {
      const csv = `Date,Description,Amount
2026-03-01,Test,€42.00`;
      const rows = parseCsv(csv, { locale: 'EN', dateFormat: 'YYYY-MM-DD' });
      expect(rows[0]!.amount).toBe(42.0);
    });

    it('"£100.50" → 100.50 (GBP)', () => {
      const csv = `Date,Description,Amount
2026-03-01,Test,£100.50`;
      const rows = parseCsv(csv, { locale: 'EN', dateFormat: 'YYYY-MM-DD' });
      expect(rows[0]!.amount).toBe(100.5);
    });

    it('negative amount "-100" → -100 (sign preserved)', () => {
      const csv = `Date,Description,Amount
2026-03-01,Test,-100`;
      const rows = parseCsv(csv, { locale: 'EN', dateFormat: 'YYYY-MM-DD' });
      expect(rows[0]!.amount).toBe(-100);
    });
  });

  describe('malformed rows', () => {
    it('malformed row → throws with line number', () => {
      const csv = `Date,Description,Amount
2026-03-01,Valid row,-15.99
not-a-row,broken,data
2026-03-03,Another valid,-20.00`;
      expect(() => parseCsv(csv, { dateFormat: 'YYYY-MM-DD' })).toThrow();
    });
  });

  describe('edge cases', () => {
    it('empty file → returns []', () => {
      const rows = parseCsv('', { dateFormat: 'YYYY-MM-DD' });
      expect(rows).toEqual([]);
    });

    it('header with extra columns ("Date,Description,Amount,Balance") → ignores Balance', () => {
      const csv = `Date,Description,Amount,Balance
2026-03-01,Netflix subscription,-15.99,1500.00
2026-03-02,Glovo order,-23.50,1400.00`;
      const rows = parseCsv(csv, { dateFormat: 'YYYY-MM-DD' });
      expect(rows).toHaveLength(2);
      expect(rows[0]!.amount).toBe(-15.99);
      expect(rows[1]!.amount).toBe(-23.5);
    });
  });
});
