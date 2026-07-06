import type { CategoryRef } from './category';
import type { ISODate } from '../engine/parseDate';

/**
 * Transaction — produced by ingestTransactions, owned by one ownerId.
 * id = SHA-256(date | cleanedDescription | amount) for dedup.
 *
 * REQ-DEDUP-1: identical {date, cleanedDescription, amount} → identical id.
 * REQ-CSV-2: raw description preserved verbatim for UI display.
 */
export interface Transaction {
  /** SHA-256 hex (64 chars) — derived from date + cleanedDescription + amount */
  id: string;
  /** ISO date string YYYY-MM-DD */
  date: ISODate;
  /** Raw description, verbatim from CSV */
  description: string;
  /** Normalized via cleanDescription — hashed input */
  cleanedDescription: string;
  /** Signed: negative = outflow, positive = inflow */
  amount: number;
  /** Sign-based stub; FR-2 swaps body */
  category: CategoryRef;
  /** A1: which user's transactions (default 'self') */
  ownerId: string;
  /** When first seen — ISO-8601 */
  firstSeenAt: string;
  /** Original CSV source file (absolute path) */
  sourceFile: string;
}
