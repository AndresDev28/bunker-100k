# Transaction Store Specification

## Purpose

Specifies how BKR-100 persists ingested transactions to a local JSON file with per-owner scoping and hash-based idempotency. Anchored to spec.md §2 FR-1 (existing local JSON/state database) and §4 (TDD blocks T-6, T-8). The capability guarantees that re-ingestion of identical data is a no-op and that owner boundaries are absolute — no cross-owner leakage even on SHA-256 hash collision.

## Requirements

### REQ-STORE-1: Storage Location & Schema
- The system MUST persist transactions to `${BUNKER_DATA_DIR:-/data}/state/transactions.json`.
- The system MUST declare `schemaVersion: 1` at the root of the file per proposal §4.
- The system MUST shape the file as `{ schemaVersion: 1; owners: Record<ownerId, Transaction[]> }` per assumption A1 (default `ownerId = 'self'`).

### REQ-STORE-2: Idempotent Upsert
- The system MUST check the transaction `id` (SHA-256 hash) BEFORE inserting.
- The system MUST return `{ added, skipped }` where `skipped` counts duplicates.
- Re-ingesting the same `Transaction[]` for a given owner MUST result in `added = 0` and `skipped >= candidates.length`.

### REQ-STORE-3: First-Seen Tracking
- The system MUST stamp `firstSeenAt: ISODateTime` on a transaction's first appearance for an owner.
- The system MUST preserve the original `firstSeenAt` across re-ingestions — it MUST NOT be overwritten on a dedup hit.

### REQ-STORE-4: Owner Isolation
- The system MUST scope all reads and writes by `ownerId`.
- Two owners ingesting overlapping CSVs MUST each receive their own independent `Transaction[]` array under `owners[ownerId]`.
- A hash collision in one owner's space MUST NOT affect any other owner's space.

### REQ-STORE-5: Read API
- The system MUST expose `readStore(dataDir: string, ownerId: string): Promise<Transaction[]>`.
- When the store file is missing or `owners[ownerId]` is undefined, the function MUST return `[]` (never throw).

## Scenarios

#### Scenario: T-6 store round-trip — empty store ingests 5 rows and persists them (spec §4 RED-GATE)
- GIVEN a fresh `transactions.json` (file missing or empty)
- WHEN `upsertTransactions(dataDir, 'self', fiveRows)` runs
- THEN the result is `{ added: 5, skipped: 0 }`
- AND `readStore(dataDir, 'self')` returns exactly those 5 transactions
- AND the file on disk contains `schemaVersion: 1` and `owners.self.length === 5`

#### Scenario: T-6 store idempotency — re-ingesting the same 5 rows is a no-op (spec §4 RED-GATE)
- GIVEN a store already containing 5 transactions for `ownerId = 'self'`
- WHEN `upsertTransactions(dataDir, 'self', sameFiveRows)` runs again
- THEN the result is `{ added: 0, skipped: 5 }`
- AND `owners.self` still contains exactly 5 entries (no duplicates)

#### Scenario: T-8 owner isolation — overlapping CSVs do not collide across owners (spec §4 RED-GATE)
- GIVEN `ownerId = 'self'` and `ownerId = 'partner'` both ingest the same CSV
- WHEN `upsertTransactions` is called sequentially for each
- THEN `owners.self` contains the full transaction set
- AND `owners.partner` contains the same full set, independently
- AND the total persisted count is `2 × rowCount`, not `rowCount`
- AND a hash collision in one space never writes into the other

#### Scenario: First-seen timestamp is preserved across re-ingestion
- GIVEN a transaction with `firstSeenAt = '2026-01-15T10:00:00Z'` already in `owners.self`
- WHEN the same row is re-ingested
- THEN the stored entry's `firstSeenAt` is still `'2026-01-15T10:00:00Z'`
- AND it is NOT updated to the new ingestion time

#### Scenario: Read of missing owner returns empty array
- GIVEN a `transactions.json` that exists but contains no `owners.partner` key
- WHEN `readStore(dataDir, 'partner')` runs
- THEN it returns `[]` without throwing