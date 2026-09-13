import { describe, it, expect } from 'vitest';
import { parseCsv } from '@/lib/engine/parseCsv';
import { parseCsvAdaptive } from '@/lib/engine/parseCsvAdaptive';

/**
 * T-14 — parseCsvAdaptive detection scenarios.
 *
 * CRITICAL: every scenario asserts EXPECTED AMOUNTS, not just row counts.
 * (R7 silent-misclassification mitigation per spec §9.)
 *
 * Privacy: all fixtures use anonymized inline strings. The real Santander
 * CSV never enters the repo (spec §6 fixture rule).
 */

// ─── helpers ─────────────────────────────────────────────────────────────

/**
 * Build an anonymized Santander-shape fixture inline.
 * Columns: FECHA OPERACIÓN,FECHA VALOR,CONCEPTO,IMPORTE EUR,SALDO
 * Each row tuple: [dateOp, dateVal, concept, amount, balance]
 */
type SantanderRow = [string, string, string, number, number];

function buildSantanderCommaFixture(rows: readonly SantanderRow[]): string {
  const header = 'FECHA OPERACIÓN,FECHA VALOR,CONCEPTO,IMPORTE EUR,SALDO';
  const body = rows
    .map(([dop, dval, concept, amount, bal]) => {
      const sign = amount < 0 ? '-' : '';
      const absAmount = Math.abs(amount).toFixed(2).replace('.', ',');
      const absBal = bal.toFixed(2).replace('.', ',');
      // Quote all 3 trailing fields — amounts and balance use comma-decimal
      // (ES locale), concept may contain commas (e.g. "AMAZON, *Order#1").
      // RFC 4180: any field containing a delimiter must be quoted.
      return `${dop},${dval},"${concept}","${sign}${absAmount}","${absBal}"`;
    })
    .join('\n');
  return `${header}\n${body}`;
}

// 22 anonymized transactions — dates spread across 2026-09; accounts for
// distinct concepts that exercise quoted-field-with-comma (e.g. "AMAZON, *Order#1").
const ANONYMIZED_SANTANDER_22: SantanderRow[] = [
  ['10/09/2026', '09/09/2026', 'AMAZON, *Order#1234', -13.3, 1486.7],
  ['10/09/2026', '10/09/2026', 'NETFLIX.COM', -14.19, 1472.51],
  ['11/09/2026', '11/09/2026', 'MERCADONA', -32.25, 1440.26],
  ['12/09/2026', '12/09/2026', 'TRANSFERENCIA RECIBIDA XXX', 212.5, 1652.76],
  ['13/09/2026', '13/09/2026', 'GLOVO *ORDER #987', -22.4, 1630.36],
  ['14/09/2026', '14/09/2026', 'REPSOL COMBUSTIBLE', -45.0, 1585.36],
  ['15/09/2026', '15/09/2026', 'NOMINA SEPTIEMBRE', 2500.0, 4085.36],
  ['16/09/2026', '16/09/2026', 'ENDESA', -78.5, 4006.86],
  ['17/09/2026', '17/09/2026', 'AMAZON PRIME', -8.99, 3997.87],
  ['18/09/2026', '18/09/2026', 'CARREFOUR', -65.3, 3932.57],
  ['19/09/2026', '19/09/2026', 'TELEFONICA', -39.9, 3892.67],
  ['20/09/2026', '20/09/2026', 'CAIXABANK SEGURO', -12.5, 3880.17],
  ['21/09/2026', '21/09/2026', 'LIDL', -47.8, 3832.37],
  ['22/09/2026', '22/09/2026', 'STRIPE PAYOUT', 146.0, 3978.37],
  ['23/09/2026', '23/09/2026', 'VODAFONE', -29.95, 3948.42],
  ['24/09/2026', '24/09/2026', 'RESTAURANTE XYZ', -55.4, 3893.02],
  ['25/09/2026', '25/09/2026', 'AMAZON, *Order#5678', -19.99, 3873.03],
  ['26/09/2026', '26/09/2026', 'TRANSFER ENVIADA XXX', -300.0, 3573.03],
  ['27/09/2026', '27/09/2026', 'IBERDROLA', -52.0, 3521.03],
  ['28/09/2026', '28/09/2026', 'SPOTIFY', -9.99, 3511.04],
  ['29/09/2026', '29/09/2026', 'ZARA', -42.5, 3468.54],
  ['30/09/2026', '30/09/2026', 'AIRBNB RESERVA', -185.0, 3283.54],
];

// ─── T-14 scenarios ──────────────────────────────────────────────────────

describe('parseCsvAdaptive', () => {
  describe('BOM strip (REQ-CSV-7.1)', () => {
    it('strips UTF-8 BOM and deep-equals parseCsv(strippedInput)', () => {
      const strictCsv = 'Date,Description,Amount\n2026-01-01,Foo,1.00\n';
      const withBom = '\uFEFF' + strictCsv;
      const expected = parseCsv(strictCsv);
      expect(parseCsvAdaptive(withBom)).toEqual(expected);
      expect(parseCsvAdaptive(withBom)[0]!.amount).toBe(1.0);
    });
  });

  describe('Preamble skip (REQ-CSV-7.2)', () => {
    it('skips 7-line preamble and finds header on line 8 → 22 transactions ingested', () => {
      const preamble = [
        'XXX BANK',
        'Extracto de cuenta: ES0000000000000000000000',
        'Titular: XXX',
        'Periodo: 01/09/2026 - 30/09/2026',
        'Divisa: EUR',
        'Fecha de generación: 30/09/2026',
        '',
      ].join('\n');
      const fixture = preamble + '\n' + buildSantanderCommaFixture(ANONYMIZED_SANTANDER_22);
      const rows = parseCsvAdaptive(fixture);
      expect(rows.length).toBe(22);
      expect(rows[0]!.amount).toBe(-13.3);
      expect(rows[0]!.description).toContain('AMAZON');
    });
  });

  describe('ES header detection (REQ-CSV-7.5)', () => {
    it('detects Santander ES header → 22 transactions with correct amounts', () => {
      const fixture = buildSantanderCommaFixture(ANONYMIZED_SANTANDER_22);
      const rows = parseCsvAdaptive(fixture);
      expect(rows.length).toBe(22);
      expect(rows[0]!.amount).toBe(-13.3);
      expect(rows[6]!.amount).toBe(2500.0);
      expect(rows[13]!.amount).toBe(146.0);
    });
  });

  describe('EN header detection (REQ-CSV-7.5)', () => {
    it('detects strict Date,Description,Amount header → deep-equals parseCsv', () => {
      const strictCsv = 'Date,Description,Amount\n2026-01-01,Foo,1.00\n2026-01-02,Bar,-2.50\n';
      expect(parseCsvAdaptive(strictCsv)).toEqual(parseCsv(strictCsv));
    });
  });

  describe('Value-date preference (REQ-CSV-7.6)', () => {
    it('prefers FECHA VALOR over FECHA OPERACIÓN when both present', () => {
      // row 0 of fixture: FECHA OPERACIÓN = 10/09/2026, FECHA VALOR = 09/09/2026
      // Expected: transactions[0].date === '2026-09-09' (VALOR, not OPERACIÓN)
      const fixture = buildSantanderCommaFixture(ANONYMIZED_SANTANDER_22.slice(0, 1));
      const rows = parseCsvAdaptive(fixture);
      expect(rows.length).toBe(1);
      expect(rows[0]!.date).toBe('2026-09-09');
    });
  });

  describe('Locale auto-detect ES (REQ-CSV-7.4)', () => {
    it('detects ES locale from ",32,25" decimal + Spanish header → -32.25 parsed', () => {
      const fixture = [
        'FECHA OPERACIÓN,FECHA VALOR,CONCEPTO,IMPORTE EUR,SALDO',
        '11/09/2026,11/09/2026,MERCADONA,"-32,25",1440,26',
      ].join('\n');
      const rows = parseCsvAdaptive(fixture);
      expect(rows.length).toBe(1);
      expect(rows[0]!.amount).toBe(-32.25);
    });
  });

  describe('Locale auto-detect EN (REQ-CSV-7.4)', () => {
    it('detects EN locale from "-13.30" decimal + EN header → -13.30 parsed', () => {
      const strictCsv = 'Date,Description,Amount\n2026-01-01,Test,-13.30\n';
      const rows = parseCsvAdaptive(strictCsv);
      expect(rows.length).toBe(1);
      expect(rows[0]!.amount).toBe(-13.3);
    });
  });

  describe('Strict-format regression gate (REQ-CSV-7.8)', () => {
    it('parseCsvAdaptive(strictCsv) deep-equals parseCsv(strictCsv) row-by-row', () => {
      const strictCsv = 'Date,Description,Amount\n2026-01-01,Test,-1.00\n';
      expect(parseCsvAdaptive(strictCsv)).toEqual(parseCsv(strictCsv));
    });
  });

  describe('Malformed header (REQ-CSV-7.2)', () => {
    it('throws with the EXACT spec message when no header signature found in 20 rows', () => {
      const junk = Array.from({ length: 20 }, (_, i) => `garbage row ${i}`).join('\n');
      expect(() => parseCsvAdaptive(junk)).toThrow(
        'No CSV header found in first 20 rows — columns Date/Description/Amount not detected',
      );
    });
  });

  describe('Empty file', () => {
    it('parseCsvAdaptive("") → []', () => {
      expect(parseCsvAdaptive('')).toEqual([]);
    });
  });

  // ─── TRIANGULATE (T3.3) ───

  describe('TRIANGULATE — single-row ambiguous locale + Spanish header', () => {
    it('falls back to ES via header-language when no decimal marker is present', () => {
      // One row, no decimal marker (truly ambiguous), header has Spanish token → ES default.
      // The detectLocale fallback only fires when neither ES-decimal nor EN-decimal matched.
      const fixture = [
        'FECHA,CONCEPTO,IMPORTE',
        '11/09/2026,MERCADONA,32',
      ].join('\n');
      const rows = parseCsvAdaptive(fixture);
      expect(rows.length).toBe(1);
      // Header-language fallback → ES locale → 32 parsed as 32 (no thousand sep)
      expect(rows[0]!.amount).toBe(32);
      expect(rows[0]!.date).toBe('2026-09-11');
    });
  });

  describe('TRIANGULATE — quoted field containing comma (R7 mitigation)', () => {
    it('parses descriptions with embedded commas correctly (RFC 4180)', () => {
      // RFC 4180: any field containing a comma (or quote/newline) MUST be
      // wrapped in double quotes. This fixture mirrors a real Santander export
      // where concept + amount + balance all contain commas (ES decimal sep).
      const fixture = [
        'FECHA OPERACIÓN,FECHA VALOR,CONCEPTO,IMPORTE EUR,SALDO',
        '10/09/2026,10/09/2026,"AMAZON, *Order#1234","-13,30","1486,70"',
      ].join('\n');
      const rows = parseCsvAdaptive(fixture);
      expect(rows.length).toBe(1);
      expect(rows[0]!.amount).toBe(-13.3);
      // The description must contain "AMAZON" intact — the quoted field is preserved.
      expect(rows[0]!.description).toContain('AMAZON');
      expect(rows[0]!.description).toContain(',');
    });
  });

  describe('TRIANGULATE — single date column fallback', () => {
    it('picks the lone Fecha column when no Valor variant present', () => {
      // Sabadell-shape: only one Fecha column (no Valor)
      const fixture = [
        'Fecha,Concepto,Importe',
        '15/09/2026,COMPRA TEST,-42.50',
      ].join('\n');
      const rows = parseCsvAdaptive(fixture);
      expect(rows.length).toBe(1);
      expect(rows[0]!.date).toBe('2026-09-15');
      expect(rows[0]!.amount).toBe(-42.5);
      expect(rows[0]!.description).toBe('COMPRA TEST');
    });
  });

  describe('TRIANGULATE — 5-column Santander end-to-end', () => {
    it('full fixture: 22 transactions, value-date preferred, sign preserved, quoted commas intact', () => {
      const preamble = [
        'XXX BANK',
        'Extracto de cuenta: ES0000000000000000000000',
        'Titular: XXX',
        'Periodo: 01/09/2026 - 30/09/2026',
        'Divisa: EUR',
        'Fecha de generación: 30/09/2026',
        '',
      ].join('\n');
      const fixture =
        preamble + '\n' + buildSantanderCommaFixture(ANONYMIZED_SANTANDER_22) + '\n';
      const rows = parseCsvAdaptive(fixture);
      expect(rows.length).toBe(22);
      // Value-date preference: row 0 has FECHA OPERACIÓN 10/09/2026, FECHA VALOR 09/09/2026
      expect(rows[0]!.date).toBe('2026-09-09');
      // Sign preserved: row 0 is negative
      expect(rows[0]!.amount).toBe(-13.3);
      // Quoted commas in description: rows 0 and 16 have "AMAZON, *Order#..."
      expect(rows[0]!.description).toContain(',');
      expect(rows[0]!.description).toContain('AMAZON');
      // Positive amounts preserved
      expect(rows[6]!.amount).toBe(2500.0);
      // Negative preserved through ES parsing
      expect(rows[17]!.amount).toBe(-300.0);
    });
  });
});