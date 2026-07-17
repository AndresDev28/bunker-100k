# Transaction Deduplication Specification

## Purpose

Specifies how BKR-100 produces a unique, deterministic identifier for every transaction and classifies it into a tier. Anchored to spec.md §2 FR-1 (SHA-256 hash) and §4 (TDD blocks T-1, T-2, T-3, T-7). The capability owns the silent foot-gun — format-equivalent inputs MUST hash identically or idempotency fails silently — and owns the FR-1 sign-based classification stub whose `CategoryRef` shape is interface-compatible with FR-2's keyword matcher. Also owns the derived Bunker Target Wants-isolation invariant that FR-3 will compute against.

## Requirements

### REQ-DEDUP-1: Hash Identity Contract
- The system MUST compute `id = SHA-256(date + cleanedDescription + amount)` per spec §2 FR-1.
- The system MUST normalize `date` to `ISODate` (YYYY-MM-DD) BEFORE hashing.
- The system MUST normalize `description` via `cleanDescription` BEFORE hashing.
- Identical `{date, cleanedDescription, amount}` triples MUST produce identical `id` values, regardless of source CSV file or format.

### REQ-DEDUP-2: Description Normalization
- `cleanDescription(raw: string): string` MUST be deterministic — same input always yields the same output (spec §4 T-7 gate).
- The function MUST lowercase the input.
- The function MUST collapse internal whitespace runs into a single space.
- The function MUST strip punctuation and merchant codes (`#`, `*`, trailing order IDs, hash-prefixed tokens).

### REQ-DEDUP-3: Date Normalization
- `parseDate(raw: string, format?: string): ISODate` MUST produce `ISODate` (YYYY-MM-DD).
- The function MUST be called BEFORE hashing so re-imports in different bank formats dedup.
- Format hints (`DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`) MAY be supplied; the default is permissive.

### REQ-DEDUP-4: Sign-Based Classification Stub
- The system MUST classify `amount < 0` as `{ tier: 'wants', subcategory: 'variables' }` per spec §2 FR-1 + §4 block 3 fallback.
- The system MUST classify `amount > 0` as `{ tier: 'income', subcategory: 'salary' }`.
- The function MUST return the `CategoryRef { tier, subcategory }` shape so FR-2's keyword matcher can replace the stub without an interface change.

### REQ-DEDUP-5: Bunker Target Wants Isolation (derived invariant)
- The system MUST define `Bt = SurvivalMonthlyCost × 6` per spec §2 FR-3.
- The system MUST NOT include any `wants.*` subcategory total in the `Bt` formula.
- Given `Needs = 1400` and `Wants = 600`, `Bt` MUST equal `8400`, NOT `12000` (spec §4 block 2 gate).

## Scenarios

#### Scenario: T-1 SHA-256 idempotency discards duplicate rows (spec §4 RED-GATE)
- GIVEN two CSVs containing the same logical transaction in different formats (e.g. `DD/MM/YYYY` vs `MM/DD/YYYY`)
- WHEN `ingestTransactions(rows, ownerId)` runs against each
- THEN the persisted store contains exactly one entry with one stable `id`
- AND the second ingestion reports `deduped >= 1`

#### Scenario: T-7 cleanDescription is deterministic across case + whitespace + punctuation (spec §4 RED-GATE)
- GIVEN `"Glovo *Order#123"` and `"GLOVO   *order # 123 "`
- WHEN `cleanDescription` runs on both
- THEN the outputs are byte-identical strings
- AND `hashTransaction` produces the same `id` for both

#### Scenario: T-3 fallback classification routes unmapped negative amounts to `wants.variables` (spec §4 RED-GATE)
- GIVEN an amount `-12.50` with no keyword matcher (FR-1 stub applies)
- WHEN `classify(-12.50)` runs
- THEN the result is `{ tier: 'wants', subcategory: 'variables' }`

#### Scenario: T-3 sign-based classification routes positive amounts to `income.salary`
- GIVEN an amount `2500.00`
- WHEN `classify(2500.00)` runs
- THEN the result is `{ tier: 'income', subcategory: 'salary' }`

#### Scenario: T-2 Wants isolation in Bunker Target — 1400 + 600 → 8400 (spec §4 RED-GATE)
- GIVEN `survivalMonthlyCost = 1400` and `wantsTotal = 600`
- WHEN `Bt = computeBunkerTarget(...)` runs
- THEN the result is `8400`
- AND the result is NOT `12000`
- AND `wantsTotal` has zero effect on `Bt`