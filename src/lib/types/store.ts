import type { Transaction } from './transaction';

export interface PersistedTransactions {
  schemaVersion: 1;
  owners: Record<string, Transaction[]>;
}

export const STORE_SCHEMA_VERSION = 1 as const;
