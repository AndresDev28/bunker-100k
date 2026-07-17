import { createHash } from 'node:crypto';

/**
 * SHA-256 transaction hash — pure function, no I/O.
 *
 * Hash input is the normalized triple: { date: ISODate, cleanedDescription, amount }
 * Normalization MUST happen before hashing (cleanDescription + parseDate in W1/W5).
 *
 * REQ-DEDUP-1: identical {date, cleanedDescription, amount} → identical id
 */
export function hashTransaction(input: {
  date: string;
  cleanedDescription: string;
  amount: number;
}): string {
  const payload = `${input.date}|${input.cleanedDescription}|${input.amount}`;
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
