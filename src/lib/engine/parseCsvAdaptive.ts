/**
 * parseCsvAdaptive — smart-detect wrapper around the FR-1 parseCsv.
 *
 * Accepts raw CSV strings from any source (browser upload, folder scan,
 * drag-and-drop, third-party bank exports) and normalizes them into the
 * FR-1 contract before delegating to the unchanged `parseCsv`. Pure function.
 *
 * REQ-CSV-7.1 — BOM strip.
 * REQ-CSV-7.2 — header signature scan (≤20 non-empty rows, all-three-slots).
 * REQ-CSV-7.3 — date format detection (ISO > DD/MM ES > MM/DD).
 * REQ-CSV-7.4 — locale detection (, decimal → ES; . decimal → EN; ambiguous → header).
 * REQ-CSV-7.5 — column mapping via synonym table.
 * REQ-CSV-7.6 — value-date preference (FECHA VALOR > FECHA OPERACIÓN).
 * REQ-CSV-7.7 — normalize to canonical 3-col CSV, forward to parseCsv.
 * REQ-CSV-7.8 — backward-compat: deep-equals parseCsv(strictCsv) row-by-row.
 */

import type { CsvRow } from './parseCsv';
import { parseCsv, splitCsvLine } from './parseCsv';
import type { DateFormatHint } from './parseDate';
import { normalizeHeader, slotForHeader } from './csvHeaderSynonyms';

const MAX_HEADER_SCAN = 20;

export function parseCsvAdaptive(raw: string): CsvRow[] {
  // ─── Step 1: BOM strip ───
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  if (raw.length === 0) return [];

  // ─── Step 2: header signature scan ───
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '');
  let headerLineIdx = -1;
  let headerCells: string[] = [];
  let columnMap: { date: number | null; description: number | null; amount: number | null } = {
    date: null,
    description: null,
    amount: null,
  };

  const scanLimit = Math.min(lines.length, MAX_HEADER_SCAN);
  for (let i = 0; i < scanLimit; i++) {
    const cells = splitCsvLine(lines[i]!);
    const slots = cells.map(slotForHeader);
    const dateSlots = slots
      .map((s, idx) => (s === 'date' ? idx : -1))
      .filter((idx) => idx !== -1);
    const descIdx = slots.indexOf('description');
    const amountIdx = slots.indexOf('amount');

    if (dateSlots.length >= 1 && descIdx !== -1 && amountIdx !== -1) {
      // Apply value-date preference inline: prefer column whose normalized
      // header contains `valor` or `value`; fall back to rightmost date column.
      const valorIdx = dateSlots.find((idx) =>
        /valor|value/.test(normalizeHeader(cells[idx]!)),
      );
      const chosenDate = valorIdx ?? dateSlots[dateSlots.length - 1]!;

      headerLineIdx = i;
      headerCells = cells;
      columnMap = {
        date: chosenDate,
        description: descIdx,
        amount: amountIdx,
      };
      break;
    }
  }

  if (headerLineIdx === -1) {
    throw new Error(
      'No CSV header found in first 20 rows — columns Date/Description/Amount not detected',
    );
  }

  // ─── Step 3: data rows + date format detection ───
  const dataRows = lines.slice(headerLineIdx + 1);
  const dateColumnIdx = columnMap.date!;
  const dateSamples = dataRows
    .slice(0, 3)
    .map((row) => {
      const cells = splitCsvLine(row);
      return cells[dateColumnIdx] ?? '';
    })
    .filter((s) => s !== '');
  const hasSpanishHeader = hasSpanishTokens(headerCells);
  const dateFormat = detectDateFormat(dateSamples, hasSpanishHeader);

  // ─── Step 4: locale detection ───
  const amountColumnIdx = columnMap.amount!;
  const amountSamples = dataRows
    .slice(0, 3)
    .map((row) => {
      const cells = splitCsvLine(row);
      return cells[amountColumnIdx] ?? '';
    })
    .filter((s) => s !== '');
  const locale = detectLocale(amountSamples, hasSpanishHeader);

  // ─── Step 5 (column mapping) — already resolved in Step 2 ───

  // ─── Step 6 (value-date preference) — already inlined in Step 2 ───

  // ─── Step 7: normalize to canonical 3-col CSV ───
  const dateIdx = columnMap.date!;
  const descIdx = columnMap.description!;
  const amountIdx = columnMap.amount!;
  const normalizedLines = [
    'Date,Description,Amount',
    ...dataRows.map((row) => {
      const cells = splitCsvLine(row);
      return [
        cells[dateIdx] ?? '',
        cells[descIdx] ?? '',
        cells[amountIdx] ?? '',
      ]
        .map(quoteIfNeeded)
        .join(',');
    }),
  ];
  const normalized = normalizedLines.join('\n');

  // ─── Step 8: forward to unchanged parseCsv ───
  return parseCsv(normalized, { locale, dateFormat });
}

// ─── Private helpers (not exported) ──────────────────────────────────────

function detectDateFormat(
  samples: readonly string[],
  hasSpanishHeader: boolean,
): DateFormatHint {
  if (samples.some((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))) return 'YYYY-MM-DD';
  // Spanish-header-slash-format → DD/MM/YYYY. Without Spanish header → MM/DD/YYYY.
  if (samples.every((s) => /^\d{2}\/\d{2}\/\d{4}$/.test(s)) && samples.length > 0) {
    return hasSpanishHeader ? 'DD/MM/YYYY' : 'MM/DD/YYYY';
  }
  // No usable sample → header-anchored default.
  return hasSpanishHeader ? 'DD/MM/YYYY' : 'MM/DD/YYYY';
}

function detectLocale(
  amountSamples: readonly string[],
  hasSpanishHeader: boolean,
): 'EN' | 'ES' {
  // ES decimal: ends with `,\d{1,2}` and NOT also ending with `.\d{1,2}`.
  // e.g. "1.234,56" matches (thousands `.` then decimal `,`), "328,11" matches.
  const esDecimal = amountSamples.some(
    (s) => /,\d{1,2}$/.test(s) && !/\.\d{1,2}$/.test(s),
  );
  if (esDecimal) return 'ES';
  // EN decimal: all samples end with `.\d{1,2}` and we have at least one sample.
  const enDecimal =
    amountSamples.length > 0 && amountSamples.every((s) => /\.\d{1,2}$/.test(s));
  if (enDecimal) return 'EN';
  // Ambiguous (no comma-decimal, no dot-decimal, or empty samples):
  // header-language fallback — Spanish header → ES, otherwise EN.
  return hasSpanishHeader ? 'ES' : 'EN';
}

function hasSpanishTokens(headerCells: readonly string[]): boolean {
  return headerCells.some((c) =>
    /fecha|valor|concepto|importe|operacion|cantidad|detalle|descripcion|importe\s+eur/i.test(
      c,
    ),
  );
}

function quoteIfNeeded(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}