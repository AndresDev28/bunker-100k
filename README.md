# BKR-100 — bunker-100k

> Local-first financial engine: idempotent CSV ingestion, SHA-256 deduplication, two-tier Needs/Wants classification.

## Status

FR-1 (CSV Ingestion & Dedup) shipped with **PASS WITH WARNINGS** verdict — see
[verify-report](openspec/changes/fr1-csv-dedup/verify-report.md). 74/74 tests green.
Spec §4 strict TDD gates active.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS** v3
- **Vitest 2** + @testing patterns
- **ESLint 9** (flat config) + **Prettier 3**

## Quickstart

```bash
npm install
npm run dev       # Next.js on http://localhost:3000
npm test          # vitest watch mode
npm run test:run  # vitest run-once
npm run typecheck # tsc --noEmit
npm run lint      # eslint .
npm run format:check
npm run build     # production build
```

## Configuration

| Env var           | Default | Purpose                                                                                                                  |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `BUNKER_DATA_DIR` | `/data` | Root for `raw/` (CSV input) and `state/` (store + log). Overrideable per-action via `dataDir` parameter (used in tests). |

## Folder Contract

| Path                                                | Direction | Purpose                                                                                           |
| --------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| `${BUNKER_DATA_DIR:-/data}/raw/*.csv`               | input     | Bank CSV exports. Header: `Date,Description,Amount`.                                              |
| `${BUNKER_DATA_DIR:-/data}/state/transactions.json` | output    | Persisted store. `schemaVersion: 1`, owner-scoped (`{ owners: Record<ownerId, Transaction[]> }`). |
| `${BUNKER_DATA_DIR:-/data}/state/ingest.log`        | output    | Append-only JSON-line audit log of skipped rows.                                                  |

## Idempotency

```
hash = SHA-256(Date + cleanedDescription + Amount)
```

`cleanedDescription` normalizes: lowercase, whitespace collapse, punctuation strip, merchant-code collapse. `parseDate` normalizes to `YYYY-MM-DD` **before** hashing.

Re-ingesting identical data returns `added: 0, deduped: N` (idempotent upsert keyed by hash; `firstSeenAt` preserved).

## Usage (Programmatic)

```ts
import { ingestFromFolder } from '@/app/actions/ingestFromFolder';

const result = await ingestFromFolder({ ownerId: 'self' });
// { ingested: 234, deduped: 0, skipped: 2, logPath: '/data/state/ingest.log', transactionCount: 234 }
```

## Architecture

Engine modules live in `src/lib/engine/` (pure domain logic) and `app/actions/` (Server Action entry points). Types in `src/lib/types/`.

### Capability Specs

- [csv-ingestion](openspec/specs/csv-ingestion/spec.md) — Server Action + CSV parser
- [transaction-dedup](openspec/specs/transaction-dedup/spec.md) — SHA-256 hash + classification stub
- [transaction-store](openspec/specs/transaction-store/spec.md) — JSON persistence + owner isolation

### FR-1 Planning Artifacts

- [proposal](openspec/changes/fr1-csv-dedup/proposal.md)
- [design](openspec/changes/fr1-csv-dedup/design.md)
- [tasks](openspec/changes/fr1-csv-dedup/tasks.md)
- [verify-report](openspec/changes/fr1-csv-dedup/verify-report.md)

## Out of Scope (FR-1)

- **UI replacement**: `sandbox/` blueprint remains the visual reference; production UI that consumes real ingested data lands in FR-2.
- **Drag-and-drop ingest**: filesystem `/data/raw` only in FR-1; `ingestFromUpload` Server Action deferred to FR-N.
- **Subcategory heuristics**: FR-1 ships sign-based classification stub (negative → Wants, positive → Income). Keyword matcher lands in FR-2.
- **Bunker Target math**: `computeBunkerTarget(survivalMonthlyCost, wantsTotal)` ships as a stub returning `survivalMonthlyCost * 6`. Full Δ_M + per-tier aggregation lands in FR-3.
- **Multi-user accounts**: A1 model has `ownerId` ('self' default) but no auth flow.

## Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(engine): add SHA-256 hash function
fix(store): preserve firstSeenAt on dedup hit
docs(readme): add BUNKER_DATA_DIR configuration
test(hash): add cross-format dedup fixture
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`. Scope is the module or work-unit affected.

## Verification

```bash
npm run test:run
# 12 test files, 74 tests passed
```

All 8 mandated test blocks (T-1 through T-8) are green. Typecheck, lint, and production build all exit 0.

## License

UNLICENSED — local-first personal project.
