# Archive Report: FR-1 Idempotent CSV Ingestion & Deduplication

> Change: `fr1-csv-dedup`
> Archived: 2026-07-17
> Mode: openspec (filesystem only — no Engram artifact for change artifacts)
> Branch: `main` (merged via PR #1, merge commit `acd282a`)
> SDD cycle: CLOSED

---

## Verdict

**PASS WITH WARNINGS** (from `verify-report.md`, 2026-07-06)

- 74/74 tests green
- `npm run typecheck` exit 0
- `npm run lint` exit 0
- `npm run build` exit 0 (Next.js 15.5.20, 2 routes, 102kB first load JS)
- 0 CRITICAL issues
- Warnings: W0 and W9 task checkboxes in `tasks.md` were unchecked despite complete implementation; W10 README intentionally deferred; logger event shape and ESLint config deviations from design are cosmetic

---

## Work Units — W0 through W10

| Unit | Goal | Status | Notes |
|------|------|--------|-------|
| W0 | Infra bootstrap (Next.js + Vitest + Tailwind + ESLint + Prettier) | Complete | 8 files; gate `npm run dev` + `npm test` green |
| W1 | T-7 cleanDescription deterministic | Complete | Pins normalization contract before hash is built |
| W2 | T-1 SHA-256 idempotency | Complete | 6/6 pass |
| W3 | T-3 sign-based classification stub | Complete | FR-2 swap boundary (same CategoryRef shape) |
| W4 | T-2 Wants isolation in computeBunkerTarget | Complete | 1400+600 → 8400, not 12000 |
| W5 | T-4 CSV parser + parseDate | Complete | 10/10 pass |
| W6 | T-5 ingestFromFolder Server Action | Complete | 9/9 pass |
| W7 | T-6 store round-trip + T-8 owner isolation | Complete | 8+4 tests pass |
| W9 | W-1 sandbox bridge amendment | Complete | `src/sandbox-bridge/frozenContracts.ts` exported; 9.2 deferred |
| W10 | README docs | **Shipped** ✅ | `BUNKER_DATA_DIR` + folder contract + idempotency — shipped at commit `1903028` |

All implementation tasks (W0–W10) are verified complete. Note: verify-report §6 WARNING-3 (dated 2026-07-06) reported W10 as deferred, but the README was shipped before the PR-1 merge on 2026-07-17.

---

## SDD Decisions

### W-1 Closure via Bridge Supersession
FR-0 extended `AuditSplitProps` additively with `needsLabels` + `wantsLabels` (commit `6aef3e5`). FR-1 resolved this by **supersession** — the production canonical contract at `src/sandbox-bridge/frozenContracts.ts` declares the new frozen `AuditSplitProps` with all 4 new fields (`sourceFiles`, `dateRange`, `transactionCount`, `ownerId`) plus the DI labels. Sandbox stays as FR-0 historical blueprint.

### Stacked-to-Main Chain Strategy
25 commits across 8 stacked PRs merged to main via PR #1. Each slice stayed within the 400-line review budget. The chain delivered W0 → W1+W2 → W3+W4 → W5 → W6 → W7+W8 → W9 independently, with clean integration at main.

### Filesystem-Only Per Assumption A4
Drag-and-drop ingest (spec FR-1 alternative wording) was explicitly out of scope per assumption A4. `ingestTransactions(rows, ownerId)` is the shared internal API; `ingestFromUpload` is deferred to FR-N. The engine is acquisition-agnostic from day one.

---

## File Counts

| Category | Count | Key Files |
|----------|-------|-----------|
| Production code | ~20 modules | `src/lib/engine/*.ts`, `src/app/actions/*.ts`, `src/lib/types/*.ts` |
| Test files | 12 | 74 tests total |
| Specs (canonical) | 3 | `csv-ingestion/spec.md`, `transaction-dedup/spec.md`, `transaction-store/spec.md` |
| Design artifacts | 5 | `explore.md`, `proposal.md`, `design.md`, `tasks.md`, `verify-report.md` |

---

## Canonical Specs — Source of Truth

The following specs are now part of the permanent `openspec/specs/` baseline:

| Capability | Location | Covers |
|------------|----------|--------|
| `csv-ingestion` | `openspec/specs/csv-ingestion/spec.md` | REQ-CSV-1 through REQ-CSV-5; T-4, T-5 |
| `transaction-dedup` | `openspec/specs/transaction-dedup/spec.md` | REQ-DEDUP-1 through REQ-DEDUP-5; T-1, T-2, T-3, T-7 |
| `transaction-store` | `openspec/specs/transaction-store/spec.md` | REQ-STORE-1 through REQ-STORE-5; T-6, T-8 |

These are the **FR-1 deltas that become the baseline for FR-2 and beyond**. They are NOT deleted on archive — they are the permanent spec record.

---

## Deferred Items

| Item | Deferred To | Reason |
|------|-------------|--------|
| W9 9.2 — `sandbox/src/components/AuditSplit.tsx` update | FR-N or never | Sandbox stays as FR-0 historical blueprint; production owns the canonical contract |
| Drag-and-drop ingest (`ingestFromUpload`) | FR-N | Assumption A4; `ingestTransactions` internal API is reusable |
| UI replacement (production components replacing `sandbox/src/fixtures.ts`) | FR-2 | spec §3; engine output ready, UI not in scope |
| Dynamic timeframe math (`Δ_M`, monthly averages, `B_t` formula) | FR-3 | spec §3 FR-3; `computeBunkerTarget` stub ready for FR-3 replacement |
| Regex/keyword subcategory heuristics | FR-2 | spec §2 FR-2; sign-based stub in place |

---

## Engram Traceability

| Observation | Topic | Content |
|-------------|-------|---------|
| #1244 | `sdd/fr1-csv-dedup/verify-report` | Full verify-report content |
| #1207 | `sdd/fr1-csv-dedup/pr-7-incident` | PR-7 sandbox destruction incident + recovery |
| #1205 | `sdd/fr1-csv-dedup/apply-progress` | W0–W10 task completion progress |
| #1204 | `sdd/fr1-csv-dedup/tasks` | Full tasks artifact with work-unit breakdown |

---

## Post-Merge State

- Branch `feat/fr1-csv-dedup` merged to `main` via PR #1 (merge commit `acd282a`)
- Working tree clean (only `.atl/*` — opencode-managed cache, non-blocking)
- `sandbox/` untouched (gitignored, untracked, FR-0 blueprint preserved)
- All 25 commits from feat/fr1-csv-dedup now on `main`

---

## Archive Contents

```
openspec/changes/archive/2026-07-17-fr1-csv-dedup/
├── explore.md         ✅ FR-1 exploration (hybrid artifact + Engram)
├── proposal.md        ✅ FR-1 proposal (hybrid artifact + Engram)
├── design.md          ✅ FR-1 technical design
├── tasks.md           ✅ W0–W10 task breakdown (74/74 tests green)
└── verify-report.md   ✅ PASS WITH WARNINGS — 0 CRITICAL
```

---

**FR-1 is officially closed.** The engine is on `main`. The spec baseline has grown by 3 capabilities. The next change starts fresh.
