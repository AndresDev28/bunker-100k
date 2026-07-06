/**
 * CSV parser — pure function, deterministic.
 *
 * Parses CSV rows into CsvRow objects (date-normalized, amount-stripped).
 * Throws on malformed rows so callers can catch, skip, and log them.
 *
 * REQ-CSV-1/2/3: header detection (case-insensitive), currency strip, malformed skip.
 */

import type { DateFormatHint, ISODate } from './parseDate';
import { parseDate } from './parseDate';

export interface CsvRow {
  date: ISODate;
  description: string;
  amount: number;
}

type ColumnMap = {
  date: number;
  description: number;
  amount: number;
};

/**
 * Split a CSV line respecting double-quoted fields (commas inside quotes don't split).
 * Also strips the surrounding double quotes and unescapes "" → ".
 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote (""): add a literal "
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      i++;
    } else {
      current += ch;
      i++;
    }
  }

  cells.push(current.trim());
  return cells;
}

function stripCurrency(value: string): string {
  // Remove currency symbols (€/$/£) and optional leading sign after currency
  // Handles "-€42,50" → "42,50" and "€-42,50" → "42,50"
  return value
    .replace(/^[€$£]\s*/, '')
    .replace(/[€$£]\s*/, '')
    .trim();
}

function parseAmount(raw: string, locale: 'EN' | 'ES'): number {
  // Remove currency symbols and signs
  let stripped = stripCurrency(raw);

  // Handle sign: may appear before currency ("-€42") or after currency ("€-42")
  const isNegative = stripped.startsWith('-') || raw.startsWith('-');
  stripped = stripped.replace(/^-/, '').trim();

  if (!stripped) throw new Error(`Unparseable amount: ${raw}`);

  if (locale === 'ES') {
    // ES: . is thousands separator, , is decimal
    // e.g. "1.234,56" → 1234.56
    const normalized = stripped.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    if (isNaN(num)) throw new Error(`Unparseable amount: ${raw}`);
    return isNegative ? -num : num;
  } else {
    // EN: , is thousands separator, . is decimal
    // e.g. "1,234.56" → 1234.56
    const normalized = stripped.replace(/,/g, '');
    const num = parseFloat(normalized);
    if (isNaN(num)) throw new Error(`Unparseable amount: ${raw}`);
    return isNegative ? -num : num;
  }
}

function parseHeader(line: string): ColumnMap {
  const cols = splitCsvLine(line).map((c) => c.toLowerCase());
  const dateIdx = cols.indexOf('date');
  const descIdx = cols.indexOf('description');
  const amountIdx = cols.indexOf('amount');

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    throw new Error(`Missing required CSV header column. Found: ${cols.join(',')}`);
  }

  return { date: dateIdx, description: descIdx, amount: amountIdx };
}

function parseRow(
  line: string,
  indices: ColumnMap,
  options?: { locale?: 'EN' | 'ES'; dateFormat?: DateFormatHint },
): CsvRow {
  const cells = splitCsvLine(line);

  if (cells.length <= Math.max(indices.date, indices.description, indices.amount)) {
    throw new Error(`Malformed CSV row (not enough columns): ${line}`);
  }

  const dateRaw = cells[indices.date];
  const descRaw = cells[indices.description];
  const amountRaw = cells[indices.amount];

  if (!dateRaw) throw new Error(`Missing date in row: ${line}`);
  if (!descRaw) throw new Error(`Missing description in row: ${line}`);
  if (!amountRaw) throw new Error(`Missing amount in row: ${line}`);

  const date = parseDate(dateRaw, options?.dateFormat);
  const amount = parseAmount(amountRaw, options?.locale ?? 'EN');

  return { date, description: descRaw, amount };
}

/**
 * Parse a CSV string into CsvRow objects.
 *
 * @param raw - raw CSV string with header row
 * @param options - locale for amount parsing, dateFormat for date parsing
 * @returns array of CsvRow
 * @throws on missing header or malformed rows
 */
export function parseCsv(
  raw: string,
  options?: { locale?: 'EN' | 'ES'; dateFormat?: DateFormatHint },
): CsvRow[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const lines = trimmed.split('\n');
  if (lines.length < 1) return [];

  const indices = parseHeader(lines[0]!);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue; // skip empty lines
    rows.push(parseRow(line, indices, options));
  }

  return rows;
}
