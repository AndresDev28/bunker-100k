# Archive Report: fr4-threshold-amount-color

**Change**: fr4-threshold-amount-color — Threshold field + amountColorClass upgrade
**Archived by**: sdd-archive sub-agent
**Archive date**: 2026-07-22
**Artifact store mode**: hybrid (OpenSpec + Engram)
**Delivery strategy**: single-PR archive (user confirmed)

---

## Merge Provenance

| Field | Value |
|-------|-------|
| Merge SHA | `973cdebe9657504917ce39945366e38ce8338766` (`main@973cdeb`) |
| Merge commit subject | `Merge pull request #13 from AndresDev28/feat/fr4-threshold-amount-color` |
| Source branch | `feat/fr4-threshold-amount-color` |
| PR | [#13](https://github.com/AndresDev28/bunker-100k/pull/13) |
| Pre-merge tip | `f3b0c29 chore(fr4): openspec planning artifacts` (orchestrator-authored planning commit) |
| Work-unit commits | `362ac3f` deriveThreshold · `4c9a9ae` amountColorClass · `ef4bd87` aggregate wiring · `a4cafc1` MacroGrid + page |
| Working tree at merge | clean (per `git status --short` empty) |
| Pre-archive PR | already merged |

---

## Summary

FR-4 (`fr4-threshold-amount-color`) lifts the FR-3-era relaxations on REQ-UI-17 and REQ-UI-13 by introducing aggregate-level threshold semantics. Two new pure modules ship: `src/lib/engine/deriveThreshold.ts` (REQ-AGG-6) computes `BunkerFixtures.threshold` from `|currentCash| / bunkerTarget` against 5% / 20% cuts, and `src/lib/engine/amountColor.ts` (REQ-UI-17) is the shared `amountColorClass(amount, threshold?)` helper consumed by `MacroGrid` via `app/page.tsx` threading. The first production use of `pink-400` lands in the alert branch (REQ-UI-13 reservation consumed). `frozenContracts.ts` is touched ONLY with the additive `threshold?: 'warning' | 'alert'` field on `BunkerFixtures` — the sanctioned T8 reversal scoped to a single field. Strict-TDD produced 23 new tests across 4 files; final suite 134/134 green against `main@973cdeb` with typecheck/lint/build all clean.

---

## Spec Sync: Canonical Changes

| Domain | File | Action |
|--------|------|--------|
| bunker-ui | `openspec/specs/bunker-ui/spec.md` | MODIFIED (REQ-UI-17) + MODIFIED (REQ-UI-13 Scenario 2) + HAND-EDIT (Capability header note) + APPENDED (TDD blocks + cross-ref) |
| bunker-aggregate | `openspec/specs/bunker-aggregate/spec.md` | MODIFIED (REQ-AGG-6 ADDED, 8 scenarios) + APPENDED (TDD blocks + cross-ref) |

### Per-requirement sync detail

| REQ-ID | Action | From (FR-3 state) | To (FR-4 state) |
|--------|--------|-------------------|-----------------|
| **REQ-UI-17** | MODIFIED | 6 scenarios: positive / negative / **warning-deferred** / **no-view-model-mutation** / **inline-location** / **single-argument-helper** | 8 scenarios: positive / negative / warning-active / alert-active / threshold-overrides-sign / **scoped-T8-reversal** / **helper-module-location** / **helper-signature-return-matrix** |
| **REQ-UI-13 Scenario 2** | MODIFIED | "Complementary accent on base (**reserved for future FRs**)" — `pink-400` RESERVED; first concrete use deferred | "Complementary accent on base (**reservation consumed**)" — `pink-400` CONSUMED in alert branch of `amountColorClass`; presence in source MUST NOT be treated as a defect |
| **bunker-ui Capability header note (line 6)** | HAND-EDIT (Risk #4, archive-only) | "Two REQ-UI scenarios are intentionally relaxed (REQ-UI-13 pink-400 reserved for future FRs; REQ-UI-17 warning/alert thresholds deferred until aggregate exposes a threshold field)" — sits OUTSIDE any requirement block; no delta could reach it | "The two REQ-UI scenarios intentionally relaxed by FR-3 were lifted by FR-4 (2026-07-22, PR #13 → commit `973cdeb`): REQ-UI-13 Scenario 2 `pink-400` reservation is now CONSUMED, and REQ-UI-17 warning/alert threshold branches are now ACTIVE" |
| **REQ-AGG-6 (Threshold Derive Rule)** | ADDED (new requirement) | n/a | 8 scenarios: alert-below-5% / warning-[5%,20%) / healthy-≥20% / lower-boundary-inclusive / upper-boundary-inclusive / zero-state-no-denominator / pure-and-deterministic / placeholder-cash-wiring |
| **TDD test blocks (cross-ref §4)** | APPENDED | Existing 3 describes (`frozen prop contracts`, `AuditSplit metadata`, `app/page.tsx zero-state`) | +2 describes for FR-4: `amountColorClass` (5 return paths + precedence) and `MacroGrid threshold wiring` (`'warning' \| 'alert' \| undefined` renders) |
| **Cross-references** | APPENDED | Project §3/§4, proposal A1/A2/A6/G1, REQ-UI-5 SUPERSEDED reference | + FR-4 archive cross-ref linking both canonicals to `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/` (PR #13 → `973cdeb`) |

### Spec-file line counts (post-sync)

| File | Before (FR-3) | After (FR-4 archive) | Δ |
|------|---------------|----------------------|---|
| `openspec/specs/bunker-ui/spec.md` | 188 lines | 209 lines | +21 (net scenario shift + cross-ref + TDD blocks; REQ-UI-17 scenarios replaced, not added) |
| `openspec/specs/bunker-aggregate/spec.md` | 65 lines | 136 lines | +71 (REQ-AGG-6 with 8 scenarios + TDD block + cross-ref) |

---

## All 19 Spec Scenarios — Final Disposition

| Scenario | Requirement | Disposition |
|----------|-------------|-------------|
| Positive amounts | REQ-UI-17 | SATISFIED — `text-emerald-400` for `> 0` with `threshold === undefined` |
| Negative amounts | REQ-UI-17 | SATISFIED — `text-red-400` for `< 0` with `threshold === undefined` |
| Warning threshold active | REQ-UI-17 | SATISFIED — `text-fuchsia-500` when `threshold === 'warning'` |
| Alert threshold active | REQ-UI-17 | SATISFIED — `text-pink-400` when `threshold === 'alert'`; first production use of `pink-400` |
| Threshold overrides sign mapping | REQ-UI-17 | SATISFIED — threshold branch wins over sign branches (incl. `0`) |
| Scoped contract extension (T8 reversal) | REQ-UI-17 | SATISFIED — `frozenContracts.ts` diff = +7 lines (docblock + additive `threshold?` on `BunkerFixtures`); all other frozen interfaces byte-stable |
| Helper module location | REQ-UI-17 | SATISFIED — `src/lib/engine/amountColor.ts` exists (21 lines, pure); `MacroGrid.tsx` imports; no local switch / `<style jsx>` |
| Helper signature and return matrix | REQ-UI-17 | SATISFIED — signature `amountColorClass(amount, threshold?)`; 5-path return matrix matches spec verbatim |
| Complementary accent on base (reservation consumed) | REQ-UI-13 | SATISFIED — `pink-400` consumed in alert branch of `amountColorClass`; present in source AND built bundle |
| Alert band below five percent | REQ-AGG-6 | SATISFIED — `deriveThreshold(100, 6000) === 'alert'` |
| Warning band between five and twenty percent | REQ-AGG-6 | SATISFIED — `deriveThreshold(600, 6000) === 'warning'` (10%) |
| Healthy at or above twenty percent | REQ-AGG-6 | SATISFIED — `deriveThreshold(3000, 6000) === undefined` (50%) |
| Lower boundary inclusive | REQ-AGG-6 | SATISFIED — `deriveThreshold(300, 6000) === 'warning'` (NOT `'alert'` at exactly 5%) |
| Upper boundary inclusive | REQ-AGG-6 | SATISFIED — `deriveThreshold(1200, 6000) === undefined` (NOT `'warning'` at exactly 20%) |
| Zero-state has no denominator | REQ-AGG-6 | SATISFIED — `deriveThreshold(*, 0) === undefined`; `buildBunkerViewModel([])` yields `threshold === undefined` (no NaN/throw) |
| Pure and deterministic | REQ-AGG-6 | SATISFIED — `vi.spyOn(Date, 'now')` never called; deep-equal on repeat; no I/O |
| Aggregate wiring with placeholder cash | REQ-AGG-6 | SATISFIED — non-empty txs + `currentCash === 0` + `bunkerTarget > 0` → `threshold === 'alert'` |

**REQ-UI-13**: 3/3 scenarios COMPLIANT (Scenario 2 reservation consumed in source and bundle; Scenarios 1 + 3 unchanged from FR-3, still SATISFIED).
**REQ-UI-17**: 8/8 scenarios COMPLIANT (the FR-3-relaxed scenarios are now lifted to FR-4-active scenarios).
**REQ-AGG-6**: 8/8 scenarios COMPLIANT (new requirement).

---

## Gate Results

| Gate | Result |
|------|--------|
| `pnpm test:run` (Vitest v2.1.9) | PASS — 134/134 tests, 19/19 files, 600ms |
| `pnpm typecheck` (`tsc --noEmit`) | PASS — exit 0; zero diagnostics under `exactOptionalPropertyTypes` |
| `pnpm lint` (`eslint .`) | PASS — exit 0 |
| `pnpm exec prettier --check 'src/**' 'app/**'` (source-scoped) | PASS — all matched files use Prettier code style |
| `pnpm build` (Next.js 15.5.20 production) | PASS — exit 0; 3/3 static pages generated; route `/` First Load JS 102 kB |
| `pnpm format:check` (repo-wide) | ⚠️ exit 1 on 18 `openspec/changes/archive/**` files (FR-1/2/3 archived docs) — PRE-EXISTING, out of FR-4 impl scope, cosmetic; zero FR-4 files flagged |

**pink-400 bundle-presence gate**: ✅ PASS — `pink-400` literal present in `.next/static/css/00a6d83316669b3e.css` (1 occurrence) alongside `fuchsia-500` (×2), `emerald-400`, `red-400`, `zinc-400`. Tailwind v3 JIT picked up the alert-branch token without `globals.css` changes (design Risk #3 resolved).

---

## Diff Stats

**Code diff** (FR-4 PR #13 → `973cdeb^1..973cdeb`):

| File | Δ | Description |
|------|---|-------------|
| `src/lib/engine/deriveThreshold.ts` | +30 | New pure predicate (REQ-AGG-6) |
| `src/lib/engine/__tests__/deriveThreshold.test.ts` | +81 | New unit suite, 10 tests (exceeds 8 task-spec) |
| `src/lib/engine/amountColor.ts` | +21 | New pure helper (REQ-UI-17) |
| `src/lib/engine/__tests__/amountColor.test.ts` | +63 | New unit suite, 8 tests (exceeds 6 task-spec) |
| `src/sandbox-bridge/frozenContracts.ts` | +7 | Additive `threshold?: 'warning' \| 'alert'` on `BunkerFixtures` (T8 reversal) |
| `src/lib/engine/buildBunkerViewModel.ts` | +15 | Wire `deriveThreshold` + conditional spread for `exactOptionalPropertyTypes` |
| `src/lib/engine/__tests__/buildBunkerViewModel.test.ts` | +38 | +2 integration tests |
| `src/components/MacroGrid.tsx` | +29/-11 | Extract color helper, import, extend local props with `threshold` |
| `src/components/__tests__/components.test.ts` | +52 | +3 component render tests |
| `app/page.tsx` | +1 | Thread `threshold={fixtures.threshold}` to `<MacroGrid>` |
| **Total code** | **~325 net authored lines** | Well under 400-line review budget |

**Scope hygiene (verify report §Correctness row 5.2)**: ✅ `BunkerHeader.tsx`, `BunkerHero.tsx`, `AuditSplit.tsx` ABSENT from the FR-4 merge diff (byte-stable). `frozenContracts.ts` diff = exactly +7 lines (additive `threshold?` on `BunkerFixtures` + docblock) — T8 reversal scope honored.

**Planning doc diff**:

| File | Lines | Notes |
|------|-------|-------|
| `openspec/changes/fr4-threshold-amount-color/proposal.md` | 121 | Intent, scope, Approach B, risks, rollback |
| `openspec/changes/fr4-threshold-amount-color/exploration.md` | 280 | Approaches A/B/C/D/E rejected recommendation matrix |
| `openspec/changes/fr4-threshold-amount-color/design.md` | 88 | Risk resolutions #1–#3 (Risk #4 deferred to archive), architecture decisions, data flow |
| `openspec/changes/fr4-threshold-amount-color/specs/bunker-ui/spec.md` | 110 | MODIFIED: REQ-UI-17 (8 scenarios) + REQ-UI-13 Scenario 2 (consumed) |
| `openspec/changes/fr4-threshold-amount-color/specs/bunker-aggregate/spec.md` | 81 | ADDED: REQ-AGG-6 (8 scenarios) |
| `openspec/changes/fr4-threshold-amount-color/tasks.md` | 49 | 5 phases, 11 tasks (RECONCILED: all boxes marked `[x]` by archive phase — see Reconciliation below) |
| `openspec/changes/fr4-threshold-amount-color/apply-progress.md` | 245 | Per-phase RED→GREEN evidence; post-validation authoring note (sdd-apply context-drop) |
| `openspec/changes/fr4-threshold-amount-color/verify-report.md` | 230 | PASS verdict, full spec-compliance matrix, TDD compliance, gate results |

**Canonical spec sync diff** (this archive, not yet committed):

| File | Δ | Description |
|------|---|-------------|
| `openspec/specs/bunker-ui/spec.md` | 188 → 209 lines (+21) | Header note hand-edit (Risk #4); REQ-UI-13 Scenario 2 MODIFIED; REQ-UI-17 MODIFIED (6 scenarios replaced with 8); TDD blocks appended; cross-ref appended |
| `openspec/specs/bunker-aggregate/spec.md` | 65 → 136 lines (+71) | REQ-AGG-6 ADDED with 8 scenarios; TDD block appended; cross-ref appended |

---

## Archived Artifacts

| Artifact | Path | Notes |
|----------|------|-------|
| Proposal | `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/proposal.md` | 121 lines; Approach B verbatim |
| Exploration | `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/exploration.md` | 280 lines; 5-approach matrix; Approach B recommended |
| Design | `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/design.md` | 88 lines; Risk #1–#3 resolved; Risk #4 deferred |
| Tasks | `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/tasks.md` | 49 lines; 11 tasks; RECONCILED: all boxes `[x]` (see Reconciliation below) |
| Apply progress | `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/apply-progress.md` | 245 lines; per-phase RED→GREEN evidence; orchestrator-authored post sdd-apply context-drop |
| Verify report (PASS) | `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/verify-report.md` | 230 lines; PASS verdict against `main@973cdeb`; 134/134 tests, 19/19 scenarios |
| Delta spec — bunker-ui | `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/specs/bunker-ui/spec.md` | 110 lines; MODIFIED REQ-UI-17 + REQ-UI-13 |
| Delta spec — bunker-aggregate | `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/specs/bunker-aggregate/spec.md` | 81 lines; ADDED REQ-AGG-6 |
| **Archive report (this file)** | `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/archive-report.md` | Authored by sdd-archive sub-agent |

---

## Tasks Reconciliation (archive-time exceptional repair)

The persisted `tasks.md` artifact in `openspec/changes/fr4-threshold-amount-color/tasks.md` arrived at archive time with all 11 task checkboxes in the **unchecked** (`- [ ]`) state — a consequence of the `sdd-apply` sub-agent context-drop that the orchestrator surfaced in `apply-progress.md` line 6 ("This artifact was authored by the orchestrator (post-validation)…"). The orchestrator's binding confirmed **"tasks 11/11, all gates green"** and `verify-report.md` proves each task's completion criterion via the per-task mapping table:

| Task | Verify evidence |
|------|-----------------|
| 1.1 RED deriveThreshold tests | `deriveThreshold.test.ts` present (81 lines, 10 tests — exceeds 8 task-spec) |
| 1.2 GREEN `deriveThreshold.ts` | 30-line pure module; focused suite green |
| 2.1 RED amountColor tests | `amountColor.test.ts` present (63 lines, 8 tests — exceeds 6 task-spec) |
| 2.2 GREEN `amountColor.ts` | 21-line pure helper importing `Threshold` from `./deriveThreshold` |
| 3.1 RED view-model integration tests | `buildBunkerViewModel.test.ts` +2 tests (alert wiring + zero-state) |
| 3.2 frozenContracts additive-only field | `git diff` = +7 lines (docblock + `threshold?` on `BunkerFixtures` only) |
| 3.3 GREEN aggregate wiring | `buildBunkerViewModel.ts` imports `deriveThreshold`, conditional spread under `exactOptionalPropertyTypes` |
| 4.1 RED component tests | `components.test.ts` +3 tests (warning / alert / undefined-with-positive) |
| 4.2 GREEN MacroGrid + page wiring | `MacroGrid.tsx` imports `amountColorClass`; `app/page.tsx:34` threads `fixtures.threshold` |
| 5.1 Full gate suite | Independently re-executed: test 134/134, typecheck 0, lint 0, build 0, source-scoped format 0 |
| 5.2 Scope hygiene | `BunkerHeader` / `BunkerHero` / `AuditSplit` byte-stable; `frozenContracts.ts` diff scoped to additive `threshold?` |

**Reconciliation action**: All 11 checkboxes in `tasks.md` flipped `- [ ]` → `- [x]` by the archive sub-agent as an exceptional mechanical repair per `sdd-archive` SKILL rule ("Only proceed if the orchestrator explicitly instructs you to reconcile stale checkboxes and `apply-progress`/`verify-report` prove every unchecked task is complete"). The orchestrator's binding satisfies both prongs (explicit "tasks 11/11" + verify-report PASS per-task mapping). No task content was edited — only the checkbox markers.

**Reason recorded**: `sdd-apply` sub-agent context-drop; orchestrator authored `apply-progress.md` post-validation rather than the standard `sdd-apply` checkbox-write. Archive phase closed the audit-trail gap with proof from `apply-progress.md` (per-phase RED→GREEN evidence) and `verify-report.md` (per-task correctness mapping, 11/11 tasks satisfied by merged tree at `main@973cdeb`).

---

## Follow-ups (NOT verify failures, NOT archive blockers)

1. **Placeholder cash (`currentCash === 0`)**: `buildBunkerViewModel.ts:101` keeps `currentCash` pinned at `0` (FR-3 placeholder discipline, REQ-AGG-4). Until FR-3 replacement lands, the **public-API threshold is always `'alert'` for non-empty stores** because `deriveThreshold(0, target>0)` always satisfies `< 5%`. Pure-module unit coverage backfills the warning and healthy bands. Verify-report follow-up line 219: "by design (spec scenario 'Aggregate wiring with placeholder cash')".

2. **Risk #4 (archive note) — RESOLVED**: The bunker-ui Capability header note (line ~6) sat outside any requirement block, so no delta spec could update it; the verify-report flagged it for archive-time hand-edit. This archive phase **hand-edited the note** to reflect FR-4 lifting the FR-3 relaxations. Resolved — no carry-over.

3. **Repo-wide `format:check` noise (pre-existing)**: 18 `openspec/changes/archive/**` files (FR-1/FR-2/FR-3 archived docs) trigger `prettier --check` warnings. Zero FR-4 files flagged. The user's `chore/fr4-archive` branch will inherit this state; a `prettier --write openspec/changes/archive/` pass clears it repo-wide but is cosmetic and pre-existing (see verify-report WARNING #2).

4. **FR-3 NICE-TO-HAVE test additions (still recommended, not blocking)**: FR-3's archive-report line 135–139 listed three NICE-TO-HAVE tests that would have closed the FR-3 coverage gap. FR-4 addressed this through dedicated `amountColor.test.ts` + `deriveThreshold.test.ts` suites — those tests now cover the same surface area more rigorously (pure-module, not via render). The FR-3 NICE-TO-HAVE list is now satisfied by FR-4's deliverable; no separate follow-up needed.

5. **Approach A — per-card thresholds (deferred to product)**: Approach A (`MacroGridProps.cards[i].threshold`) was explored and rejected as the FR-4 baseline (see `exploration.md` §3). Approach A remains a candidate for a future FR if per-card nuance (income healthy / wants high) becomes a product requirement. `BunkerFixtures.threshold` would persist as a fallback when per-card thresholds are absent.

6. **FR-5: persist user thresholds (explicit non-goal)**: Approach C / `Transaction.threshold` / `STORE_SCHEMA_VERSION=2` was rejected for FR-4 (explicit non-goal). When user thresholds become a product requirement, FR-5 will own the persistence + UI + migration.

---

## Branches to Delete (After PR Merge)

Local:
- `feat/fr4-threshold-amount-color` (merged into main via PR #13)
- `chore/fr4-archive` (after this archive PR merges)

Remote:
- `origin/feat/fr4-threshold-amount-color` (merged; safe to delete)

---

## SDD Cycle Complete

The `fr4-threshold-amount-color` change has been fully planned (proposal + exploration + design + tasks), implemented (Phases 1–4, 11/11 tasks), verified (PASS #1358 against `main@973cdeb`), and archived. Canonical `openspec/specs/bunker-ui/spec.md` carries the activated threshold branches (REQ-UI-17, 8 scenarios) and the consumed `pink-400` reservation (REQ-UI-13 Scenario 2). Canonical `openspec/specs/bunker-aggregate/spec.md` carries the new REQ-AGG-6 derive rule (8 scenarios). All planning artifacts reside under `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/`. The active change folder `openspec/changes/fr4-threshold-amount-color/` is empty (dispatcher treats as archived). The T8 reversal is fully contained in the additive `threshold?: 'warning' | 'alert'` field on `BunkerFixtures`. Ready for the next change.

---

## Commit Plan (user is the git executor)

The user runs all git commands. The working tree is **post-archive, pre-commit**. Below is the recommended branch + commit sequence on top of `main@973cdeb`.

### Branch

- Base: `main` (at `973cdeb`)
- Branch name: `chore/fr4-archive`

### Commits (ordered — smallest first)

1. **`chore(fr4): sync FR-4 deltas into canonical specs`**
   - Files (canonical spec edits):
     - `openspec/specs/bunker-ui/spec.md` — header note hand-edit, REQ-UI-13 Scenario 2 MODIFIED, REQ-UI-17 MODIFIED, TDD blocks + cross-ref appended
     - `openspec/specs/bunker-aggregate/spec.md` — REQ-AGG-6 ADDED, TDD block + cross-ref appended

2. **`chore(fr4): archive planning artifacts and report`**
   - Files (archive move + tasks reconciliation + archive-report authoring):
     - `openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/` (new folder, 8 files: proposal, exploration, design, tasks — with checkboxes reconciled, apply-progress, verify-report, specs/{bunker-ui,bunker-aggregate}/spec.md, archive-report.md)
     - `openspec/changes/fr4-threshold-amount-color/` (folder now empty — may be removed or left as-is)

### Git commands for the user

```bash
# 0. Working tree should currently show:
#    - 2 modified canonical specs (bunker-ui, bunker-aggregate)
#    - 8 untracked files in openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/
#    - 0 files in openspec/changes/fr4-threshold-amount-color/ (the active folder is empty)
#
# Confirm with: git status --short

# 1. Branch off main
git checkout main
git pull --ff-only origin main        # main is at 973cdeb
git checkout -b chore/fr4-archive

# 2. Commit 1 — canonical spec sync
git add openspec/specs/bunker-ui/spec.md openspec/specs/bunker-aggregate/spec.md
git diff --cached --stat
# Expect: openspec/specs/bunker-ui/spec.md | 188 +++++++++++++++++++-- ... 209
#         openspec/specs/bunker-aggregate/spec.md | 65 ++++++++++++ ... 136
git commit -m "chore(fr4): sync FR-4 deltas into canonical specs

- REQ-UI-17 MODIFIED: 6 FR-3 scenarios replaced by 8 FR-4 scenarios
  (warning-active, alert-active, threshold-overrides-sign, scoped-T8-reversal,
  helper-module-location, helper-signature-return-matrix); positive/negative
  scenarios preserved with explicit threshold=undefined GIVEN.
- REQ-UI-13 Scenario 2 MODIFIED: pink-400 reservation CONSUMED (alert branch).
- bunker-ui Capability header note HAND-EDITED (FR-4 Risk #4): both
  FR-3 relaxations now lifted, not deferred.
- REQ-AGG-6 ADDED with 8 scenarios (Threshold Derive Rule, 5%/20% cuts,
  purity, zero-state safety, placeholder-cash wiring).
- TDD test blocks appended to both canonicals; cross-references updated
  to point at openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/."

# 3. Commit 2 — archive move + report
git add openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/
# If the empty active folder persists, remove it (it has no tracked files):
rmdir openspec/changes/fr4-threshold-amount-color 2>/dev/null || true
git status --short
# Expect: 8 new files under openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/
git commit -m "chore(fr4): archive planning artifacts and report

Move openspec/changes/fr4-threshold-amount-color/ → archive/2026-07-22-fr4-threshold-amount-color/
with the following artifacts (8 files):
  - proposal.md (121 lines)
  - exploration.md (280 lines)
  - design.md (88 lines)
  - tasks.md (49 lines, 11/11 boxes reconciled by archive phase)
  - apply-progress.md (245 lines, per-phase RED→GREEN evidence)
  - verify-report.md (230 lines, PASS verdict at main@973cdeb)
  - specs/bunker-ui/spec.md (110 lines, delta MODIFIED REQ-UI-17 + REQ-UI-13)
  - specs/bunker-aggregate/spec.md (81 lines, delta ADDED REQ-AGG-6)
  - archive-report.md (this archive report)

Reconciliation note: tasks.md checkboxes arrived unchecked due to the
sdd-apply sub-agent context-drop documented in apply-progress.md line 6.
Archive phase flipped all 11 boxes to [x] as an exceptional mechanical
repair per sdd-archive SKILL rule; proof from apply-progress.md per-phase
evidence + verify-report.md per-task correctness mapping. See
archive-report.md 'Tasks Reconciliation' section for the full audit trail.

Author: sdd-archive sub-agent (hybrid mode)"

# 4. Push and open the PR
git push -u origin chore/fr4-archive

gh pr create \
  --base main \
  --head chore/fr4-archive \
  --title "chore(fr4): archive FR-4 planning + sync canonical specs" \
  --body "Closes the SDD cycle for fr4-threshold-amount-color (merged via PR #13 at commit 973cdeb).

**Canonical spec sync**:
- REQ-UI-17 MODIFIED: FR-3 relaxation lifted to active threshold branches (8 scenarios; positive/negative preserved; warning-active / alert-active / threshold-overrides-sign / scoped-T8-reversal / helper-module-location / helper-signature-return-matrix added).
- REQ-UI-13 Scenario 2 MODIFIED: pink-400 reservation CONSUMED (alert branch of amountColorClass).
- bunker-ui Capability header note HAND-EDITED (Risk #4): FR-3 relaxations are now lifted, not deferred.
- REQ-AGG-6 ADDED: Threshold Derive Rule (8 scenarios; 5%/20% cuts; purity; zero-state safety; placeholder-cash wiring).
- TDD blocks + cross-references appended to both canonicals.

**Archive move**:
- openspec/changes/fr4-threshold-amount-color/ → openspec/changes/archive/2026-07-22-fr4-threshold-amount-color/ (8 files: proposal, exploration, design, tasks, apply-progress, verify-report, two delta specs, archive-report).

**Tasks reconciliation** (exceptional mechanical repair, archive-time):
- tasks.md checkboxes were unchecked due to the sdd-apply sub-agent context-drop documented in apply-progress.md line 6.
- Archive phase flipped all 11 boxes to [x] with proof from apply-progress.md (per-phase RED→GREEN evidence) + verify-report.md (per-task correctness mapping; 11/11 satisfied by merged tree at main@973cdeb).
- See archive-report.md 'Tasks Reconciliation' section.

**Pre-existing (NOT this PR)**:
- Repo-wide pnpm format:check flags 18 openspec/changes/archive/** files from FR-1/2/3; cosmetic; zero FR-4 files flagged.

Linked REQs: REQ-UI-17 (MODIFIED) · REQ-UI-13 Scenario 2 (MODIFIED) · REQ-AGG-6 (ADDED)."
```

### Optional cleanup after PR merge

```bash
# Delete the local archive branch after merge
git checkout main
git pull --ff-only origin main
git branch -d chore/fr4-archive

# The remote archive branch deletion happens automatically when the PR is merged
# via GitHub's "Delete branch" button, or manually:
git push origin --delete chore/fr4-archive
```

---

*Archived by: sdd-archive sub-agent, 2026-07-22*
*Hybrid mode (OpenSpec + Engram)*
*NOT committed — user reviews diff before manual commit + PR per the SDD executor boundary.*