# BKR-100 — Bunker Financial Engine

Local-first financial engine for idempotent CSV ingestion with SHA-256 deduplication.

## Stack

- **Next.js 15** App Router + **React 19** + **TypeScript** (strict)
- **Tailwind CSS** v3
- **Vitest** for unit tests
- **ESLint** + **Prettier**

## Quickstart

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm test          # watch mode
npm run test:run  # single run
npm run typecheck # tsc --noEmit
npm run lint
npm run format:check
```

## Project Structure

```
src/
  lib/
    engine/       # Pure domain logic (hash, parse, classify, store)
    types/        # Shared TypeScript types
app/
  actions/        # Next.js Server Actions (ingest entry points)
```

## Data Contract

| Path                                                | Purpose                     |
| --------------------------------------------------- | --------------------------- |
| `${BUNKER_DATA_DIR:-/data}/raw/*.csv`               | Source CSV files            |
| `${BUNKER_DATA_DIR:-/data}/state/transactions.json` | Persisted transaction store |
| `${BUNKER_DATA_DIR:-/data}/state/ingest.log`        | Row-level skip audit log    |

## Idempotency Guarantee

Transactions are keyed by `SHA-256(date + cleanedDescription + amount)`. Re-importing the same CSV yields `added: 0, skipped: N` — no duplicates.

## FR-1 Scope

- Idempotent CSV ingestion via `ingestFromFolder` Server Action
- SHA-256 deduplication with `cleanDescription` normalization
- JSON store with `schemaVersion: 1`
- Sign-based classification stub (`amount < 0 → wants.variables`, `amount > 0 → income.salary`)
- `computeBunkerTarget(survivalMonthlyCost, wantsTotal)` stub returning `survivalMonthlyCost * 6`

FR-2 (UI) and FR-3 (full Bt formula) deferred.
