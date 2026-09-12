/**
 * CSV header synonym table — pure module, deterministic.
 *
 * Maps header tokens (EN + ES, mixed case, with/without diacritics) to the
 * three canonical slots consumed by the CSV ingest pipeline: `date`,
 * `description`, `amount`. Pure functions — no I/O, no clock, no randomness.
 *
 * REQ-CSV-7.9 / REQ-CSV-7.10 — synonym table + normalizeHeader helper.
 * REQ-CSV-7.5 — column mapping via synonym lookup.
 */

export type CanonicalSlot = 'date' | 'description' | 'amount';

/**
 * Tokens are stored POST-normalization (lowercase, NFD-diacritic-stripped,
 * whitespace-collapsed, trimmed). `slotForHeader` normalizes the candidate
 * header first, so callers never have to pre-normalize.
 *
 * Iteration order encodes priority: `date` → `description` → `amount`.
 * First-match-wins.
 */
export const CSV_HEADER_SYNONYMS: Readonly<Record<CanonicalSlot, readonly string[]>> =
  Object.freeze({
    date: Object.freeze([
      'date',
      'fecha',
      'fecha valor',
      'fecha operacion',
      'f.operacion',
      'fec. valor',
      'value date',
      'booking date',
    ]),
    description: Object.freeze([
      'description',
      'concepto',
      'descripcion',
      'detalle',
    ]),
    amount: Object.freeze([
      'amount',
      'importe',
      'importe eur',
      'cantidad',
      'value',
    ]),
  });

/**
 * Normalize a header string for matching against the synonym table.
 *
 * Steps (in order):
 *   1. NFD-decompose — separates base characters from combining diacritics.
 *   2. Strip combining diacritics (Unicode Combining Diacritical Marks U+0300..U+036F).
 *   3. Lowercase.
 *   4. Collapse internal whitespace to a single space.
 *   5. Trim leading/trailing whitespace.
 *
 * Pure: same input → same output across invocations.
 */
export function normalizeHeader(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve a header token to its canonical slot via the synonym table.
 * Returns `null` for unknown tokens (e.g. `SALDO`, `BALANCE`, `IBAN`).
 *
 * Pure: depends only on the input and the (immutable) synonym table.
 */
export function slotForHeader(raw: string): CanonicalSlot | null {
  const normalized = normalizeHeader(raw);
  if (!normalized) return null;

  for (const slot of Object.keys(CSV_HEADER_SYNONYMS) as CanonicalSlot[]) {
    if (CSV_HEADER_SYNONYMS[slot].includes(normalized)) {
      return slot;
    }
  }
  return null;
}