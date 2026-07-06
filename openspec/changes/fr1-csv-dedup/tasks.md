# Tasks: FR-1 Idempotent CSV Ingestion & Deduplication

> Environment: **[production]** — Next.js 15 App Router + TypeScript strict + Tailwind + Vitest.
> Strict TDD: **ACTIVATES HERE** — every W-unit closes only when its specific test block is green.
> Order is **mandatory** (T-7→T-1 foot-gun: hash contract MUST be pinned before hash is built).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1100–1450 across 11 work-units (greenfield bootstrap dominates) |
| 400-line budget risk | High (single PR); Low (chained) |
| Chained PRs recommended | Yes |
| Suggested split | PR-1=W0 / PR-2=W1+W2 / PR-3=W3+W4 / PR-4=W5 / PR-5=W6 / PR-6=W7+W8 / PR-7=W9 / PR-8=W10 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (pending user decision) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Bootstrap Next.js + Vitest + Tailwind toolchain | PR 1 | Greenfield configs; gate: `npm run dev` + `npm test` green |
| 2 | Pin hash contract + idempotency test | PR 2 | T-7 before T-1 (foot-gun pair) |
| 3 | Sign-based classify + Wants-isolating Bt stub | PR 3 | Pure stubs; FR-2/FR-3 swap boundary |
| 4 | CSV parser + date parser + currency strip | PR 4 | Pure parse; logger injected for tests |
| 5 | Server Action entry point + shared internal ingest API | PR 5 | `ingestFromFolder` + `ingestTransactions` |
| 6 | JSON store round-trip + owner isolation | PR 6 | Two store tests share `store.ts` API |
| 7 | W-1 amendment: sandbox bridge + AuditSplitProps | PR 7 | Independent of engine |
| 8 | README: BUNKER_DATA_DIR + folder contract + idempotency | PR 8 | Docs last |

## Critical Path / Dependencies

W0 (infra gate) → W1 (T-7 pins normalization) → W2 (T-1 hash builds on W1) → W3 (T-3 classify stub) → W4 (T-2 Bt stub) → W5 (T-4 CSV parser, needs hash + cleanDescription) → W6 (T-5 Server Action, needs parse + ingest) → W7 (T-6 store, needs hash) → W8 (T-8 owner isolation, needs store) → W9 (W-1 amendment, type-only) → W10 (docs, after store ships).

W9 (type bridge) is the only W-unit that can run in parallel with W1–W8. W10 lands last.

## Work Units

### W0 — Infra bootstrap [production]
Gate: `npm run dev` boots Next.js on localhost:3000; `npm test` runs (0 tests ok); `tsc --noEmit` exits 0.

- [ ] 0.1 `package.json` + `package-lock.json` — Next.js 15, React 19, TS, Tailwind v3, Vitest; scripts `dev`/`build`/`test`/`lint`/`typecheck`.
- [ ] 0.2 `next.config.ts` — App Router, no experimental flags.
- [ ] 0.3 `tsconfig.json` — `strict`, `noUncheckedIndexedAccess`, `@/*` → `./src/*`.
- [ ] 0.4 `tailwind.config.ts` + `postcss.config.js` — content `./app/**/*.{ts,tsx}` + `./src/**/*.{ts,tsx}`.
- [ ] 0.5 `vitest.config.ts` — `environment: 'node'`, `@/` alias.
- [ ] 0.6 `.eslintrc.json` + `.prettierrc` — `next/core-web-vitals` + ts-checked; 2-space, single quotes, 100-col.
- [ ] 0.7 `.gitignore` — extend existing: `node_modules/`, `.next/`, `coverage/`, `*.log`.
- [ ] 0.8 `app/layout.tsx` + `app/page.tsx` — root layout + placeholder; UI replacement deferred to FR-2.

Verification: `npm install && npm run dev` (port 3000 green), `npm test` (0 tests passes), `tsc --noEmit` exit 0.
Estimated: ~250–350 lines.

### W1 — T-7 cleanDescription determinism [production]
Depends on: W0. Gate: scenario `Given "Glovo *Order#123" + "GLOVO   *order # 123 " → byte-identical cleaned` green.

- [x] 1.1 `src/lib/engine/__tests__/clean-description.test.ts` — RED: 4 Given/When/Then scenarios (case fold, whitespace collapse, punctuation strip, byte-identity gate).
- [x] 1.2 `src/lib/engine/cleanDescription.ts` — GREEN: lowercase + collapse whitespace + strip `#*` + trailing order IDs.

Verification: `npx vitest run src/lib/engine/__tests__/clean-description.test.ts` — 7/7 pass.
Estimated: ~80–130 lines.

### W2 — T-1 SHA-256 hash idempotency [production]
Depends on: W0, W1. Gate: scenario `identical {date, cleanedDesc, amount} → identical id + deduped ≥ 1` green.

- [x] 2.1 `src/lib/engine/__tests__/hash.test.ts` — RED: idempotency across formats, hash stability for same input, dedup hit case.
- [x] 2.2 `src/lib/engine/hash.ts` — GREEN: `hashTransaction({date, cleanedDescription, amount})` using `node:crypto`.

Verification: `npx vitest run src/lib/engine/__tests__/hash.test.ts` — 6/6 pass.
Estimated: ~90–130 lines.

### W3 — T-3 fallback classification [production]
Depends on: W0. Gate: `classify(-12.50) === {tier:'wants', subcategory:'variables'}` + positive case.

- [x] 3.1 `src/lib/engine/__tests__/classify.test.ts` — RED: negative → wants.variables, positive → income.salary, zero → fallback.
- [x] 3.2 `src/lib/engine/classify.ts` — GREEN: sign-based stub returning `CategoryRef` (FR-2 swap boundary).

Verification: `npx vitest run src/lib/engine/__tests__/classify.test.ts` — all pass.
Estimated: ~50–80 lines.

### W4 — T-2 Wants isolation in computeBunkerTarget [production]
Depends on: W0. Gate: `computeBunkerTarget(1400, 600) === 8400` AND `!== 12000`.

- [x] 4.1 `src/lib/engine/__tests__/bunker-target.test.ts` — RED: 1400+600 → 8400, wantsTotal ignored, signature pins 2nd arg.
- [x] 4.2 `src/lib/engine/computeBunkerTarget.ts` — GREEN: stub `return survivalMonthlyCost * 6` (FR-3 replaces body).

Verification: `npx vitest run src/lib/engine/__tests__/bunker-target.test.ts` — all pass.
Estimated: ~40–65 lines.

### W5 — T-4 CSV parser [production]
Depends on: W0, W1, W2. Gate: header detection + currency strip + malformed skip-and-log green.

- [x] 5.1 `src/lib/engine/__tests__/parse-csv.test.ts` — RED: standard headers (case-insensitive), currency strip (€/$/£), thousands sep, malformed skip.
- [x] 5.2 `src/lib/engine/parseCsv.ts` — GREEN: header detect → row parse → inject logger for skipped rows.
- [x] 5.3 `src/lib/engine/parseDate.ts` — GREEN: permissive DD/MM/YYYY / MM/DD/YYYY / YYYY-MM-DD → ISODate (BEFORE hash).

Verification: `npx vitest run src/lib/engine/__tests__/parse-csv.test.ts` — all pass.
Estimated: ~150–220 lines.

### W6 — T-5 filesystem-source Server Action [production]
Depends on: W0, W5, W2. Gate: `ingestFromFolder('/data/raw/*.csv')` returns full `IngestResult` + honors `dataDir` override.

- [x] 6.1 `src/app/actions/__tests__/ingest-from-folder.test.ts` — RED: folder scan, `dataDir` override, `BUNKER_DATA_DIR` env, default `ownerId='self'`.
- [x] 6.2 `src/app/actions/ingestFromFolder.ts` — GREEN: `'use server'`, scan `${dataDir:-/data}/raw/*.csv`, route to `ingestTransactions`.
- [x] 6.3 `src/app/actions/ingestTransactions.ts` — GREEN: shared internal `ingestTransactions(rows, ownerId)` (acquisition-agnostic, reusable by FR-N upload).

Verification: `npx vitest run src/app/actions/__tests__/ingest-from-folder.test.ts` — all pass.
Estimated: ~110–170 lines.

### W7 — T-6 store round-trip [production]
Depends on: W0, W2. Gate: empty → ingest 5 → 5 persisted + re-ingest → `{added:0, skipped:5}` green.

- [x] 7.1 `src/lib/types/transaction.ts` + `store.ts` + `ingest.ts` — Types: `Transaction`, `PersistedTransactions { schemaVersion:1, owners }`, `IngestResult`, `IngestLogEvent`.
- [x] 7.2 `src/lib/engine/__tests__/store.test.ts` — RED: empty→5→re-ingest scenarios, `firstSeenAt` preservation, missing-owner returns `[]`.
- [x] 7.3 `src/lib/engine/store.ts` — GREEN: `readStore` + `upsertTransactions` (idempotent, owner-scoped, hash-keyed).
- [x] 7.4 `src/lib/engine/logger.ts` — GREEN: append JSON-line to `${dataDir}/state/ingest.log`.

Verification: `npx vitest run src/lib/engine/__tests__/store.test.ts` — all pass.
Estimated: ~225–330 lines.

### W8 — T-8 owner isolation [production]
Depends on: W0, W7. Gate: `self` + `partner` ingest overlapping CSV → independent arrays, total 2× rowCount.

- [x] 8.1 `src/lib/engine/__tests__/owner-isolation.test.ts` — RED: separate file (1-file-per-responsibility); two owners ingest same CSV, hash collision never crosses.

Verification: `npx vitest run src/lib/engine/__tests__/owner-isolation.test.ts` — all pass.
Estimated: ~50–80 lines.

### W9 — W-1 sandbox bridge amendment [production]
Depends on: W0 (TS types must exist). Independent of W1–W8.

- [ ] 9.1 `src/sandbox-bridge/frozenContracts.ts` — NEW: re-export `Eur`, `NeedsSubcategory`, `WantsSubcategory`, `CategoryLine`, `BunkerSummary`, `BunkerFixtures`; export NEW `AuditSplitProps` (DI labels + `sourceFiles` + `dateRange` + `transactionCount` + `ownerId`).
- [ ] 9.2 `sandbox/src/components/AuditSplit.tsx` — MODIFY: extend props interface to match new frozen shape (additive, no breakage).

Verification: `tsc --noEmit` exit 0; sandbox smoke test still passes (visual blueprint unchanged).
Estimated: ~50–90 lines.

### W10 — Docs [production]
Depends on: W7 (data contract must exist). Gate: README explains env var, folder layout, idempotency.

- [ ] 10.1 `README.md` — NEW: project intro, `BUNKER_DATA_DIR` env var, `/data/raw/*.csv` + `/data/state/transactions.json` contract, idempotency guarantee (`added:0` on re-ingest), quickstart (`npm install && npm run dev && npm test`).

Verification: README committed, no broken cross-references; `npm test` still 8/8 green.
Estimated: ~50–100 lines.

## Review Workload Forecast (detail)

- **Total estimated changed lines**: ~1100–1450 across all 11 work-units (greenfield bootstrap W0 is the largest at ~250–350).
- **Single-PR review budget risk**: **High** — total exceeds 400-line review budget by ~3×.
- **Chained PR review budget risk**: **Low** — every proposed slice (PR-1..PR-8) is within 400 lines; only PR-6 (W7+W8) is marginal at ~275–410.
- **Decision needed before apply**: **Yes** — orchestrator must ask user to choose between:
  - (a) **chained PRs to main** (`stacked-to-main`) — recommended; fast iteration, each slice self-contained.
  - (b) **feature-branch-chain** — tracker branch accumulates integration; PRs target immediate parent. Use only if rollback control outweighs speed.
  - (c) **size:exception** — single PR with maintainer approval. Acceptable for greenfield bootstrap but heavy for review.

### Chained PR slice sketch

| PR | Work-units | Test blocks added | Lines | Verification |
|----|------------|--------------------|-------|--------------|
| PR-1 | W0 | (none — infra gate) | ~250–350 | `npm run dev` + `npm test` + `tsc --noEmit` |
| PR-2 | W1 + W2 | T-7, T-1 | ~170–260 | `vitest run src/lib/engine/__tests__/{clean-description,hash}.test.ts` |
| PR-3 | W3 + W4 | T-3, T-2 | ~90–145 | `vitest run src/lib/engine/__tests__/{classify,bunker-target}.test.ts` |
| PR-4 | W5 | T-4 | ~150–220 | `vitest run src/lib/engine/__tests__/parse-csv.test.ts` |
| PR-5 | W6 | T-5 | ~110–170 | `vitest run src/app/actions/__tests__/ingest-from-folder.test.ts` |
| PR-6 | W7 + W8 | T-6, T-8 | ~275–410 | `vitest run src/lib/engine/__tests__/{store,owner-isolation}.test.ts` |
| PR-7 | W9 | (none — type change) | ~50–90 | `tsc --noEmit` + sandbox smoke |
| PR-8 | W10 | (none — docs) | ~50–100 | `npm test` (regression) + README review |

## Risks per Work Unit

| W | Risk | Mitigation |
|---|------|-----------|
| W0 | Bootstrap friction (greenfield, every config new) | W0 must close GREEN before any T-block starts; if `tsc --noEmit` fails, halt. |
| W1 | Normalization nondeterminism breaks idempotency silently | W1 closes **before** W2 (hash); T-7 pins the contract. |
| W2 | Hash input nondeterminism (if W1 regresses) | T-1 includes format-cross-dedup fixture; fails loudly if W1 slips. |
| W3 | Stub bleeds into FR-2 impl | `classify` returns `CategoryRef` shape (not raw sign); FR-2 swaps the body, not the signature. |
| W4 | Wants isolation forgotten in FR-3 | `wantsTotal` is 2nd positional arg, visible in signature. |
| W5 | Date format ambiguity | `parseDate` runs BEFORE hash; per-bank format hint optional. |
| W6 | Two Server Actions drift (folder vs upload) | Internal `ingestTransactions(rows, ownerId)` is shared; only folder action in FR-1. |
| W7 | Concurrent-write race | Acceptable at FR-1 scale; `schemaVersion: 1` enables future SQLite migration. |
| W8 | Hash collision crosses owners | `owners[ownerId]` keying is absolute; collision check is per-owner only. |
| W9 | W-1 amendment grows scope | Bounded to `AuditSplitProps`; new props required for spec §3 micro-metadata. |
| W10 | Docs drift from code | README quickstart command must run; cross-references kept minimal. |