# Delta for bunker-read-action

## Capability
ADDED — the read entry surface for the FR-2 UI. Cross-refs: project `spec §2` (FR-1 data dir), `§4` (strict TDD); baseline `transaction-store` (REQ-STORE-5 `readStore`), `csv-ingestion` (REQ-CSV-5 `ingestFromFolder`).

## ADDED Requirements

### Requirement: REQ-READ-1: Server Action Surface
The system MUST expose `loadTransactions(input?): Promise<Transaction[]>` as a Next.js Server Action declared with `'use server'` at `src/app/actions/loadTransactions.ts`. The action MUST default `ownerId` to `'self'` (A4). The action MUST delegate ownership/file resolution and the actual read to `readStore` (REQ-STORE-5) — it MUST NOT reimplement store reads or JSON parsing.

#### Scenario: Read action is a Server Action
- GIVEN the source file `src/app/actions/loadTransactions.ts`
- WHEN inspected
- THEN its first executable line is `'use server'`
- AND it exports `loadTransactions`

### Requirement: REQ-READ-2: Shared Environment Resolution
The system MUST resolve the data directory via a single `resolveDataDir()` helper and the owner via a single `resolveOwnerId()` helper, both exported from `src/lib/engine/env.ts`. `loadTransactions` (read) and `ingestFromFolder` (write, REQ-CSV-5) MUST consume the SAME helpers — no literal `process.env.BUNKER_DATA_DIR` resolution MAY exist outside `env.ts`. `resolveDataDir()` MUST default to `/data` when `BUNKER_DATA_DIR` is unset; `resolveOwnerId()` MUST default to `'self'`.

#### Scenario: Read and write resolve the same data dir
- GIVEN `BUNKER_DATA_DIR=/srv/bunker` and an existing store populated by `ingestFromFolder`
- WHEN `loadTransactions()` runs with no `input`
- THEN it reads from the same `${BUNKER_DATA_DIR}/state/transactions.json` that `ingestFromFolder` wrote to
- AND no `process.env.BUNKER_DATA_DIR` literal appears outside `env.ts`

#### Scenario: default data dir honored
- GIVEN `BUNKER_DATA_DIR` unset
- WHEN `resolveDataDir()` is called
- THEN it returns `/data` (mirroring REQ-CSV-1)

### Requirement: REQ-READ-3: Missing-Owner Resilience
The action MUST return `[]` (never throw) when the store file is missing or `owners[ownerId]` is undefined, delegating to `readStore` semantics (REQ-STORE-5). The `input` parameter MAY override `dataDir`/`ownerId` for tests; overrides MUST be passed straight to `readStore`.

#### Scenario: Owner with persisted data
- GIVEN a store containing 5 transactions for `ownerId = 'self'`
- WHEN `loadTransactions()` runs
- THEN it resolves `Promise<Transaction[]>` of length 5
- AND the array is referentially stable for that store state

#### Scenario: Owner missing → empty array
- GIVEN a `transactions.json` that exists but has no `owners.partner` key
- WHEN `loadTransactions({ ownerId: 'partner' })` runs
- THEN it returns `[]` without throwing

#### Scenario: Re-ingested data is stable to read
- GIVEN a store populated then re-ingested idempotently (REQ-STORE-2)
- WHEN `loadTransactions()` runs after re-ingestion
- THEN the returned `Transaction[]` length is unchanged vs. the first read
- AND `firstSeenAt` stamps match the first read (no overwrite per REQ-STORE-3)

## Strict-TDD Test Blocks (cross-ref spec §4)
The following named Vitest block MUST pass natively before implementation is accepted:
- `describe('read action: loadTransactions')`
  - `it('returns persisted transactions for ownerId=self')`
  - `it('returns [] for a missing owner without throwing')`
  - `it('shares resolveDataDir/resolveOwnerId with ingestFromFolder — same data dir')`
  - `it('honors input.dataDir override for tests')`

## Cross-references
- Project `spec §2` (FR-1 data dir), `§4` (strict-TDD gate).
- Baseline `transaction-store` REQ-STORE-2 / REQ-STORE-3 / REQ-STORE-5.
- Baseline `csv-ingestion` REQ-CSV-1 / REQ-CSV-5 (shared-helper symmetry).
- Proposal A3, A4.