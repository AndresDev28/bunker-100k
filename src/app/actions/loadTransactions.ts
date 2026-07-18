'use server';
/**
 * loadTransactions — Server Action entry point for FR-2 UI read path.
 *
 * REQ-READ-1: 'use server' surface; delegates to readStore (REQ-STORE-5).
 * REQ-READ-2: consumes shared resolveDataDir/resolveOwnerId from env.ts.
 * REQ-READ-3: returns [] for missing owner (delegates to readStore semantics).
 *
 * Symmetry with ingestFromFolder: same input shape, same env helpers.
 */
import { readStore } from '@/lib/engine/store';
import { resolveDataDir, resolveOwnerId } from '@/lib/engine/env';
import type { Transaction } from '@/lib/types/transaction';

export async function loadTransactions(input?: {
  ownerId?: string;
  dataDir?: string;
}): Promise<Transaction[]> {
  const ownerId = input?.ownerId ?? resolveOwnerId();
  const dataDir = input?.dataDir ?? resolveDataDir();
  return readStore(dataDir, ownerId);
}
