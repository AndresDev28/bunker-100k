/**
 * Date parser — pure function, deterministic.
 *
 * Parses dates into ISODate format ('YYYY-MM-DD'). Throws on garbage input so that
 * parseCsv can catch, skip, and log malformed rows. If format is omitted, the input
 * MUST already be in ISO format (strict per design assumption A2).
 *
 * REQ-CSV-2: parseDate runs BEFORE hash to normalize date ambiguity.
 */

export type DateFormatHint = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type ISODate = string; // 'YYYY-MM-DD'

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) return 29;
  return days[month - 1] as number;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

function parseIsoParts(raw: string): [number, number, number] | null {
  // Matches YYYY-MM-DD with optional missing leading zeros
  const m = raw.match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function parseSlashParts(raw: string): [number, number, number] | null {
  const parts = raw.split('/');
  if (parts.length !== 3) return null;
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

/**
 * Parse a date string into ISODate format.
 *
 * @param raw - the raw date string
 * @param format - optional format hint. If omitted, raw MUST be ISO ('YYYY-MM-DD').
 * @throws if the input cannot be parsed or represents an invalid date.
 */
export function parseDate(raw: string, format?: DateFormatHint): ISODate {
  if (!raw || typeof raw !== 'string') throw new Error(`Invalid date input: ${raw}`);

  const trimmed = raw.trim();

  if (!format || format === 'YYYY-MM-DD') {
    // Strict: if no format hint, expect ISO already
    const parts = parseIsoParts(trimmed);
    if (!parts) throw new Error(`Invalid ISO date: ${trimmed}`);
    const [y, m, d] = parts;
    if (!isValidDate(y, m, d)) throw new Error(`Invalid date: ${trimmed}`);
    return `${String(y).padStart(4, '0')}-${padTwo(m)}-${padTwo(d)}`;
  }

  if (format === 'DD/MM/YYYY') {
    const parts = parseSlashParts(trimmed);
    if (!parts) throw new Error(`Invalid date: ${trimmed}`);
    const [dayStr, monthStr, yearStr] = parts;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    if (!isValidDate(year, month, day)) throw new Error(`Invalid date: ${trimmed}`);
    return `${String(year).padStart(4, '0')}-${padTwo(month)}-${padTwo(day)}`;
  }

  if (format === 'MM/DD/YYYY') {
    const parts = parseSlashParts(trimmed);
    if (!parts) throw new Error(`Invalid date: ${trimmed}`);
    const [monthStr, dayStr, yearStr] = parts;
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    if (!isValidDate(year, month, day)) throw new Error(`Invalid date: ${trimmed}`);
    return `${String(year).padStart(4, '0')}-${padTwo(month)}-${padTwo(day)}`;
  }

  throw new Error(`Unsupported date format: ${format}`);
}
