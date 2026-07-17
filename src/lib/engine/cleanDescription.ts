/**
 * Deterministic description normalizer — hashes AFTER normalization.
 *
 * Normalization pipeline:
 * 1. lowercase
 * 2. NFKD Unicode normalization (strips diacritics per Context7 node:crypto notes)
 * 3. punctuation → space (including #, *, etc.)
 * 4. collapse whitespace runs to single space
 * 5. strip trailing order IDs (6+ digit runs at word boundary)
 * 6. trim
 *
 * T-7 gate: "Glovo *Order#123" and "GLOVO   *order # 123 " → byte-identical
 */
export function cleanDescription(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\d{6,}\b/g, '')
    .trim();
}
