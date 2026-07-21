# Exploration: fr4-threshold-amount-color

> **Status**: exploration only — no proposal/spec/design/tasks. Strict TDD active.
> Pre-decessor: FR-3 (`fr3-ui-styling`, archived 2026-07-20) deliberately relaxed the
> `amountColorClass` threshold branches (REQ-UI-17 Scenario 3) until the aggregate
> exposes a `threshold?: 'warning' | 'alert'` field. FR-4 is the follow-up FR that
> lifts that relaxation.

## 1. Current State

**Amounts as a domain concept.** Amounts are modeled as a plain `number` aliased to
`Eur`, and appear at four distinct scopes:

| Scope              | Type                                                                                 | File                                          | Role                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Per-transaction    | `Transaction.amount: number` (`signed: <0 outflow, >0 inflow`)                       | `src/lib/types/transaction.ts:21`             | Row-level money values; hashed for dedup                                             |
| Per-category-line  | `CategoryLine<K>.amount: Eur`                                                        | `src/sandbox-bridge/frozenContracts.ts:23-28` | Aggregated totals per subcategory                                                    |
| Per-summary        | `BunkerSummary.{survivalMonthlyCost, bunkerTarget, currentCash}` + `monthsRemaining` | `frozenContracts.ts:30-35`                    | Top-line figures driving `BunkerHero` and progress                                   |
| Per-MacroGrid-card | `MacroGridProps.cards[i].value: number \| string`                                    | `frozenContracts.ts:50-52`                    | Three cards only (income, wants, saveRate); `string` allowed for label-safe fallback |

Persistence (`src/lib/engine/store.ts`): `PersistedTransactions = { schemaVersion: 1; owners: Record<ownerId, Transaction[]> }`.
Schema is versioned (`STORE_SCHEMA_VERSION = 1`). Any new field on `Transaction`
forces a `schemaVersion: 2` migration.

Validation: `parseCsv` (raw CSV → `CsvRow`), `parseDate`, `cleanDescription`,
`classify` (sign-stub returning `CategoryRef`), `hashTransaction({ date, cleanedDescription, amount })` —
all pure. The hash is the dedup key; the threshold field's placement matters
relative to this contract (see Approach A vs B).

Color logic today (`src/components/MacroGrid.tsx:13-17`):

```ts
function amountColorClass(amount: number): string {
  if (amount > 0) return 'text-emerald-400';
  if (amount < 0) return 'text-red-400';
  return 'text-zinc-400';
}
```

Co-located in `MacroGrid.tsx` only — not exported, not a shared util. Called once at
line 28: `className={... ${amountColorClass(numericValue)} ...}`. The
`numericValue` is coerced via `typeof card.value === 'number' ? card.value : 0`,
so a `string` card value silently degrades to neutral `text-zinc-400`.

No thresholds exist anywhere in source. The FR-3 design (lines 33-39) and tasks
(lines 28-34) explicitly wrote the _intended_ helper signature for this follow-up:

```ts
function amountColorClass(amount: number, threshold?: 'warning' | 'alert'): string {
  if (threshold === 'alert') return 'text-pink-400';
  if (threshold === 'warning') return 'text-fuchsia-500';
  // sign mapping falls through
}
```

Tokens reserved for these branches are already documented in the design token
table (FR-3 design §D4): `text-pink-400` (attention, 7.8:1 AAA), `text-fuchsia-500`
(primary, 6.3:1 AA). `pink-400` is RESERVED in canonical REQ-UI-13 Scenario 2 — its
first concrete use was scheduled for "a follow-up FR that introduces warning/alert
states". FR-4 is exactly that follow-up.

## 2. Affected Areas (affected files ordered by criticality)

- `src/components/MacroGrid.tsx` — broaden helper signature, thread `threshold` per
  card, add two new return branches; co-location requirement (REQ-UI-17
  "Inline CSS rule location") preserved.
- `src/sandbox-bridge/frozenContracts.ts` — at least one type bump. Two scopes:
  (a) `MacroGridProps.cards[i]` gains an optional `threshold?: 'warning' | 'alert'`,
  or (b) `BunkerFixtures` gains a top-level `threshold?: 'warning' | 'alert'`. Either
  shape change breaks the FR-3 "frozenContracts byte-identical" guard — that guard
  was a T8-REVERSAL signal in FR-3's verify report, intentionally lifted for this
  follow-up.
- `src/lib/engine/buildBunkerViewModel.ts` — if per-card thresholds derive from
  computed aggregates (e.g., `wantsTotal` exceeds a heuristic → that card becomes
  'warning'), the aggregate picks up a small derive step. If the source is purely
  configuration (user-set), the aggregate stays untouched and a separate setting
  pass threads thresholds into `cards`.
- `openspec/specs/bunker-ui/spec.md` — REQ-UI-17 Scenario "Warning / alert
  thresholds (deferred)" becomes SATISFIED and the dual signle-argument scenarios
  (Scenario "Helper signature is single-argument in FR-3" + Scenario "No
  view-model mutation") get MODIFIED / removed.
- `openspec/specs/bunker-aggregate/spec.md` — if the threshold source is per-aggregate
  (Approach B below), add a new requirement covering the derive rule and reference
  REQ-UI-17.
- `src/components/__tests__/components.test.ts` — needs new tests covering the
  helper signature variants; the existing "renders label, value, trend" block is
  shape-permissive and will keep passing without modification.
- `src/lib/engine/__tests__/buildBunkerViewModel.test.ts` — if Approach B is
  chosen, add derive-rule tests (zero-state threshold, threshold pinned when input
  deterministic).
- `openspec/changes/archive/2026-07-20-fr3-ui-styling/` — read-only reference; the
  verify report there already documents the T8 reversal expected at this FR.
- (NOT a code file) `src/lib/types/store.ts` — IF the threshold lives on
  `Transaction` (per-row), bump `STORE_SCHEMA_VERSION` and add a migration test. If
  on the aggregate, no store change.

## 3. Approaches (two clean scopes; mixed-scope is rejected — see Risks)

### Approach A — `MacroGridProps.cards[i].threshold` (per-card)

Each card's threshold is set independently at the aggregate (`buildBunkerViewModel`)
or via user config. `MacroGrid.tsx` reads `card.threshold` and forwards it to the
helper.

**Pros**

- Three cards today (income/wants/saveRate) get independent thresholds (e.g., wants
  exceeding 30% of survival = `warning`; income below survival = `alert`).
- Cards already carry metadata (`label`, `value`, `trend`) — adding `threshold`
  is a co-scope extension, no top-level shape change to `BunkerFixtures`.
- Aligns 1:1 with the user's wording: "threshold field on amounts/transactions"
  → per-row amount gets a per-card visual interpretation.
- Zero-store-migration: thresholds are derived in the aggregate, not persisted.

**Cons**

- Requires the aggregate to know WHAT to compare against for each card (e.g., for
  wants: `|wantsTotal| / survivalMonthlyCost`). Some thresholds (e.g., saveRate)
  don't have a natural sign-based threshold source.
- The `value: number | string` card shape still has the silent-cast-to-zero
  behavior; per-card thresholds must coexist with that.

**Effort**: Medium (~80–150 net lines: aggregate derive rule + helper broadening +
per-card type + 4–6 new tests).

### Approach B — `BunkerFixtures.threshold` (aggregate-level, matches FR-3 deferred wording literally)

`BunkerFixtures` gains `threshold?: 'warning' | 'alert'` (single value). The
aggregate picks the worst card's threshold (max-severity propagation). All cards
get the same color decision. `amountColorClass` takes `(amount, threshold?)`.

**Pros**

- This is the EXACT shape the FR-3 archive-report follow-up text calls for
  (line 131): _"`threshold?: 'warning' | 'alert'` field on `BunkerFixtures`"_.
- Smallest possible change: one new field on `BunkerFixtures`, helper signature
  flip, macroGrid passes the aggregate value down.
- No per-card derive complexity. The aggregate picks a threshold once.

**Cons**

- All three cards get the same threshold at the same time — a single `warning`
  overrides. Card-level nuances (income healthy but wants high) get lost.
- Doesn't match the orchestrator's natural phrasing "threshold field on
  amounts/transactions" as cleanly — it's a single aggregate flag, not per-row.
- Aggregate-level UX feels less precise than per-card UX in a financial UI.

**Effort**: Low (~40–90 net lines: BunkerFixtures field + aggregate derivation +
helper broadening + 3–4 new tests).

### Approach C — `Transaction.threshold` (per-row, persisted)

Each transaction carries a `threshold: 'normal' | 'warning' | 'alert'` field. The
aggregate computes a card-level threshold from the worst transactions per category.

**Pros**

- True per-row provenance — re-ingestion preserves the threshold.
- Aligns literally with the user's wording.

**Cons**

- **Bumped `STORE_SCHEMA_VERSION` to 2** — requires migration test + branch in
  `readStore` to fall back to `threshold = 'normal'` for v1 data. Largest blast
  radius.
- Threshold is a _visual_ decision, not a _data_ fact — putting it on `Transaction`
  collapses a UI concern into the canonical data model. Cross-owner and dedup
  semantics change if threshold participates in the hash (it must NOT — see
  dedup invariance below).
- Storage write-cost is non-zero (every row gains a field), and reads of v1 stores
  must default gracefully.

**Effort**: High (~200–350 net lines: store schema bump + migration test +
aggregate rollup + helper broadening + 6–10 new tests + readStore fallback).

**Dedup invariance (critical for any Approach using `Transaction`):** the hash
key MUST remain `{ date, cleanedDescription, amount }` (REQ-DEDUP-1). If
`threshold` participates in the hash, two rows with the same trip but different
visual flags will collide differently — a breaking dedup semantic. **Approach C
requires `threshold` to be added AFTER hash, not in the hash input.** This is
verified in `src/lib/engine/hash.ts:11-18` and `ingestTransactions.ts:28-30`.

### Approach D — Out of scope: extend the `MacroGridProps.cards[i].value` discriminator

Adding `'warning' | 'alert'` to the `value: number | string` union would conflate
value and tone. Rejected.

### Approach E — Out of scope: derive purely from amount magnitude (e.g., `|amt| > 5000` always warns)

Hardcoded threshold magnitudes drift by FX/inflation/personal context. The user's
"configurable" requirement rejects this.

## 4. Recommendation

**Approach B (aggregate-level `BunkerFixtures.threshold`) is the recommended
baseline**, with an eye toward A if/when card-level nuance becomes a product need.
Rationale:

1. **Verbatim fit to FR-3 follow-up contract**. The archived verify report
   (`verify-report-final.md:146-148`) explicitly authoritatively states that the
   follow-up FR must: (a) expose `threshold?: 'warning' | 'alert'` on the
   aggregate, (b) update `amountColorClass` to `(amount, threshold?)`, (c) reverse
   the T8 frozen-guard. Approach B is precisely this. Approach A would require
   re-negotiating the FR-3 archived contract; Approach C compounds the contract
   with a store schema bump.
2. **Lowest review-budget risk**. ~40–90 net authored lines fits the 400-line
   budget with comfortable headroom for tests; aligns with FR-3's
   design/tasks/apply diff (112 lines) and well under any chained-PR trigger.
3. **Strict TDD clean path**. Three test additions cover: (a) helper signature
   variants, (b) aggregate derives threshold from max-severity rule, (c)
   `MacroGrid` renders correct class string per `(amount, threshold)` tuple. No
   fixture rewrites; existing 111-test suite stays green.
4. **Determinism preserved**. `buildBunkerViewModel` is pure (REQ-AGG-1 +
   existing test at `buildBunkerViewModel.test.ts:270-292`); adding a derive
   step does not break the `Date.now`/I-O assertions.

The product can graduate to Approach A later (per-card thresholds, richer UX)
without touching Approach B's foundation — `BunkerFixtures.threshold` can
remain as a fallback when per-card thresholds are absent.

## 5. Risks

- **Frozen-guard reversal (T8)**: FR-3 verify flagged that lifting the
  `frozenContracts.ts byte-identical` guard was the open question; FR-4 lifts it
  by intent. Proposal text MUST explain the reversal explicitly to ward off
  reviewer confusion (the FR-3 archive already documented it as a known
  reversal, so reviewers seeing the FR-3 history will read it correctly).
- **Color-logic regression on existing cards**: `amountColorClass` currently
  has exactly 3 return paths and is referenced by `MacroGrid.tsx:28`. A
  signature flip without updating the call site at line 28 yields `undefined`
  classes — silent CSS break. TDD mitigates.
- **Helper single-arg test in components.test.ts**: the existing FR-3-era
  implicit test `MacroGrid renders cards` (line 291) does NOT cover the helper
  signature. The three new tests MUST cover helper-level signature + return
  paths explicitly to lock the new surface.
- **Aggregate purity break**: if the threshold derive step uses any
  non-deterministic source (e.g., `Date.now`, env read), REQ-AGG-1 fails.
  Approach B derive rule must be pure over the same input `transactions[]`.
- **Schema-version drift (Approach C only)**: bumping `STORE_SCHEMA_VERSION` to 2
  requires updating `STORE_SCHEMA_VERSION` constant, `readStore` fallback path,
  and one migration test. Not relevant if A or B chosen.
- **Token omission in bundle**: `pink-400` and `fuchsia-500` must appear in the
  `next build` CSS bundle for the alert/warning branches to actually render.
  FR-3's verify already required this. `next build` is the gate.
- **Test-coverage gap baseline**: there is currently NO unit test that imports
  `amountColorClass` directly (the verifier flagged this as a NICE-TO-HAVE on
  FR-3 archive line 137). FR-4 should add at minimum one `describe('amountColorClass')`
  block — pure-unit is cheap (`MacroGrid.tsx` is not exported, so the describe
  block would test via `renderToStaticMarkup` or by exporting the helper for
  testability; see approach note below).

## 6. Open Decisions for Propose Phase

The propose phase will need explicit answers to:

- **Scope of threshold**: per-card (A) vs per-aggregate (B). Recommendation:
  B as baseline.
- **Threshold source**: heuristic (e.g., `|wantsTotal| > 0.3 * survivalMonthlyCost`
  → 'warning') vs user-config (persisted in a future settings store, OUT OF SCOPE
  for FR-4). Recommendation: heuristic for FR-4, document the user-config path in
  Out-of-Scope.
- **Helper testability**: keep `amountColorClass` private to `MacroGrid.tsx` (must
  test via render) OR export it from a sibling module (e.g.,
  `src/lib/ui/amountColor.ts`) for pure-unit tests. Recommendation: extract to a
  sibling module so pure-unit tests are clean and the component stays a thin
  consumer — matches the existing "helpers co-located in their consumer"
  convention only loosely, but pure-test wins.
- **Cross-owner impact**: thresholds are per-aggregate (per-owner) — Approach B is
  naturally owner-scoped via `buildBunkerViewModel(transactions)`.

## 7. Ready for Proposal

**Yes.** All five investigation points are covered with file-level evidence and
CodeGraph-verified call paths. The proposal phase can:

1. Lock Approach B (aggregate-level) or pivot to A.
2. Author `proposal.md` referencing the FR-3 follow-up text and the lifted
   T8 frozen-guard reversal.
3. Write `specs/bunker-ui/spec.md` (REQ-UI-17 modifications) and
   `specs/bunker-aggregate/spec.md` (new derive rule) deltas.
