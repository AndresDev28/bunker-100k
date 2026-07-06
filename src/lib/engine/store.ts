import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PersistedTransactions } from '@/lib/types/store';
import { STORE_SCHEMA_VERSION } from '@/lib/types/store';
import type { Transaction } from '@/lib/types/transaction';

const STORE_FILENAME = 'transactions.json';

/**
 * Read all transactions for a given owner from the persisted store.
 * Auto-creates the store file with schemaVersion:1 if it doesn't exist.
 * Returns [] for an ownerId that has never been written (no throw).
 */
export async function readStore(dataDir: string, ownerId: string): Promise<Transaction[]> {
  await ensureStoreShape(dataDir);
  const raw = await fs.readFile(path.join(dataDir, 'state', STORE_FILENAME), 'utf8');
  const parsed = JSON.parse(raw) as PersistedTransactions;
  if (parsed.schemaVersion !== STORE_SCHEMA_VERSION) {
    throw new Error(
      `schemaVersion mismatch, expected ${STORE_SCHEMA_VERSION}, got ${parsed.schemaVersion}`,
    );
  }
  return parsed.owners[ownerId] ?? [];
}

/**
 * Idempotent upsert: inserts only transactions whose id is not already present
 * for this owner. Returns counts of added vs skipped (duplicate) candidates.
 *
 * firstSeenAt is NEVER overwritten on a duplicate hit — it is preserved from
 * the first insertion.
 *
 * Concurrency note (FR-1 scale):
 * At FR-1 scale (hundreds of transactions/month, assumption A7) concurrent
 * Server Action invocations are unlikely. This implementation uses a
 * read-modify-write cycle that is ACCEPTABLE for FR-1. A future SQLite
 * migration (enabled by schemaVersion:1) would add file-level locking or
 * transactions for strong concurrency guarantees.
 */
export async function upsertTransactions(
  dataDir: string,
  ownerId: string,
  candidates: readonly Transaction[],
): Promise<{ added: number; skipped: number }> {
  await ensureStoreShape(dataDir);
  const storePath = path.join(dataDir, 'state', STORE_FILENAME);
  const raw = await fs.readFile(storePath, 'utf8');
  const parsed = JSON.parse(raw) as PersistedTransactions;
  if (parsed.schemaVersion !== STORE_SCHEMA_VERSION) {
    throw new Error(
      `schemaVersion mismatch, expected ${STORE_SCHEMA_VERSION}, got ${parsed.schemaVersion}`,
    );
  }
  const existing: Transaction[] = parsed.owners[ownerId] ?? [];
  const existingIds = new Set(existing.map((t) => t.id));
  let added = 0;
  let skipped = 0;
  const merged = [...existing];
  for (const c of candidates) {
    if (existingIds.has(c.id)) {
      skipped += 1;
      continue;
    }
    merged.push(c);
    existingIds.add(c.id);
    added += 1;
  }
  parsed.owners[ownerId] = merged;
  await fs.writeFile(storePath, JSON.stringify(parsed, null, 2), 'utf8');
  return { added, skipped };
}

/**
 * Ensure the state directory and transactions.json file exist with a valid
 * empty shape. Safe to call repeatedly — only creates if absent.
 */
async function ensureStoreShape(dataDir: string): Promise<void> {
  const dir = path.join(dataDir, 'state');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, STORE_FILENAME);
  try {
    await fs.access(file);
  } catch {
    const empty: PersistedTransactions = { schemaVersion: STORE_SCHEMA_VERSION, owners: {} };
    await fs.writeFile(file, JSON.stringify(empty, null, 2), 'utf8');
  }
}
