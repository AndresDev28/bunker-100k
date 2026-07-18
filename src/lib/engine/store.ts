import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PersistedTransactions } from '@/lib/types/store';
import { STORE_SCHEMA_VERSION } from '@/lib/types/store';
import type { Transaction } from '@/lib/types/transaction';

const STORE_FILENAME = 'transactions.json';

/**
 * File-based exclusive lock using open(lockPath, 'wx').
 * Blocks until the lock is acquired; releases on scope exit.
 * Works across async operations and (in single-process) prevents
 * read-modify-write races during concurrent upserts.
 */
async function withStoreLock<T>(dataDir: string, fn: () => Promise<T>): Promise<T> {
  const lockPath = path.join(dataDir, 'state', 'transactions.lock');
  let fd: fs.FileHandle | undefined;
  // Retry on EEXIST (lock held by another caller)
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      fd = await fs.open(lockPath, 'wx');
      break;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
        // Another writer holds the lock — yield and retry
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }
      throw err;
    }
  }
  if (!fd) throw new Error('Failed to acquire store lock after 100 attempts');
  try {
    return await fn();
  } finally {
    await fd.close();
    await fs.unlink(lockPath).catch(() => {
      /* lock file may already be gone */
    });
  }
}

/**
 * Read all transactions for a given owner from the persisted store.
 *
 * READ-ONLY: does NOT create the state directory or the store file.
 * If the store file is missing (never written) or its parent directory is
 * missing, returns [] gracefully. Other errors (EACCES on read, JSON parse
 * errors, schemaVersion mismatch) still propagate.
 *
 * This preserves the "no throw on empty store" contract without violating
 * read semantics (no fs.mkdir on a read path). See hotfix/fr1.
 */
export async function readStore(dataDir: string, ownerId: string): Promise<Transaction[]> {
  const storePath = path.join(dataDir, 'state', STORE_FILENAME);
  let raw: string;
  try {
    raw = await fs.readFile(storePath, 'utf8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // Store has never been written — graceful empty state.
      return [];
    }
    throw err;
  }
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

  return withStoreLock(dataDir, async () => {
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
  });
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
