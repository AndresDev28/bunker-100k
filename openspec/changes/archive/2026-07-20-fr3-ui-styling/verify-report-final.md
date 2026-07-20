# Verify Report (Final): fr3-ui-styling — Tailwind styling on FR-2 UI surfaces

> Post-merge validation against `main@b895cef` (PR #9 + PR #10 merged).

## Verdict

**STATUS**: FAILED

All executable gates pass on `main@b895cef`: 17 test files / 111 tests, type-check, lint, source-scoped formatting, and `next build` all exit 0. The PR #10 contrast fix successfully removes every `text-zinc-500` occurrence, but the merged implementation does not satisfy two explicit final checks: neither the source nor CSS bundle contains `pink-400`, and the co-located `amountColorClass` helper has no warning/alert threshold parameter. Archive is therefore not authorized until the implementation/spec contract is reconciled and verification is rerun.

## Comparison vs prior verify (#1312)

| Item | Prior #1312 | Final #1314 | Resolved |
|------|-------------|-------------|----------|
| zinc-500 body floor | WARNING (2 matches) | PASS — 0 matches in `src/` and `app/`; 0 in CSS bundle | yes |
| Overall verdict | PASS-WITH-WARNINGS | FAILED under the requested final static checks | no |

The prior report also documented that `pink-400` was absent from the bundle and that the threshold form of the helper was over-specified relative to the current view model. Those conditions remain present; the PR #10 fix addressed only the zinc-500 warning.

## Gates (run from `main@b895cef`)

| Gate | Result |
|------|--------|
| `npm run test:run` (resolved test command; underlying `vitest run`) | pass — 17/17 test files, 111/111 tests |
| `npm exec -- tsc --noEmit` | pass — exit 0 |
| `npm exec -- eslint .` | pass — exit 0 |
| `npm exec -- prettier --check 'src/**' 'app/**'` | pass — exit 0 |
| `npm run build` (underlying `next build`) | pass — exit 0; shared first-load JS 102 kB; CSS bundle `.next/static/css/a76b1634360f286b.css` is 7,775 bytes; required classes present except `pink-400` |

`next build` emitted a non-fatal warning that the Next.js ESLint plugin was not detected in the ESLint configuration. It did not affect the exit code.

## Verification evidence (strict result envelope)

```yaml
strict_result:
  substantive_failure: true
  command_failed: false
  test_command: npm run test:run
  test_exit_code: 0
  test_output_hash: sha256:dd2da2396f1a8d0989fcaef9766542348112942c7aeb38d0dfe134f8013167b7
  typecheck_command: npm exec -- tsc --noEmit
  typecheck_exit_code: 0
  typecheck_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  lint_command: npm exec -- eslint .
  lint_exit_code: 0
  lint_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  prettier_command: npm exec -- prettier --check 'src/**' 'app/**'
  prettier_exit_code: 0
  prettier_output_hash: sha256:686dc9421712565fa159cea3f5ad7ecb79ea07b8ebfb363563d0b7d288c0d19c
  build_command: npm run build
  build_exit_code: 0
  build_output_hash: sha256:6c2dea0a6c7ec4d436b39eb7c4b331a5273a7a41c3b8353f2b10dd6771695fba
```

## REQ-UI validation

| REQ | Scenarios checked | Result |
|-----|--------------------|--------|
| REQ-UI-12 (Dark-only Root) | 2 | PASS — `globals.css:1-3` has ordered Tailwind v3 directives; `layout.tsx:2,6-7` imports CSS and sets `dark`, `lang="en"`, `bg-zinc-950` |
| REQ-UI-13 (Palette WCAG AA) | 3 | FAIL — fuchsia and zinc-400 floor pass, but `rg` finds zero `text-pink-400` / `border-pink-400` / `bg-pink-400` matches in `src/` or `app/`; bundle also lacks `pink-400` |
| REQ-UI-14 (Typography Scale) | 2 | PASS — numeric containers in the changed surfaces use `font-mono tabular-nums`; labels remain sans/default |
| REQ-UI-15 (Spacing + Borders) | 2 | PASS — zinc-800 borders and standard 4px-based utilities are present; no arbitrary spacing values found |
| REQ-UI-16 (Zero-Motion) | 2 | PASS — zero motion utility matches, no reduced-motion block, and no `dark:bg-*`, `dark:text-*`, or `dark:border-*` variants |
| REQ-UI-17 (MacroGrid Colors) | 5 | FAIL — zero/positive/negative mapping and co-location pass, but `amountColorClass` is `function amountColorClass(amount: number)` only; the required warning/alert calls cannot return fuchsia/pink mappings |
| REQ-UI-5 Supersede (archive-time) | 1 | PENDING (archive phase responsibility) — canonical `openspec/specs/bunker-ui/spec.md:50-57` remains original; delta marker is present at `openspec/changes/fr3-ui-styling/specs/bunker-ui/spec.md:5-14` |

## Guards

| Guard | Result |
|-------|--------|
| `frozenContracts.ts` byte-identical to FR-2 | pass — required diff exit 0 |
| No motion classes (`transition/animate/duration/ease/motion`) | pass — zero matches in `src/` and `app/`; zero in CSS bundle |
| No `dark:*` variants beyond root | pass — zero `dark:bg-*`, `dark:text-*`, `dark:border-*` matches |
| No zinc-500 body text (post-PR #10) | pass — zero source/app matches and zero bundle matches |
| No tone prop in any frozen interface | pass — zero `tone` matches in `src/` and `app/` |
| Test net drift (`src/components/__tests__/`) | pass — `git diff 08e92d8..b895cef -- src/components/__tests__/` is empty |
| Bundle token completeness | fail — all requested tokens present except `pink-400` |

## Diff stats (PR #9 + PR #10)

| Metric | Forecast | Actual | Match |
|--------|----------|--------|-------|
| Code lines (PR #9 + PR #10 fix) | ~112-114 | 112 base-to-final changed lines (`73 insertions + 39 deletions`); 114 cumulative review touches when the two PR #10 replacement lines are counted separately | yes — under forecast and budget |
| Files changed (code) | 6 implementation files plus 2 fix-line touches | 6 unique code files; the 2 fix lines are in existing `MacroGrid.tsx` and `AuditSplit.tsx` | yes — unique-file count is 6, not 8 |
| OpenSpec planning docs | 4 | 4 files, 370 insertions | yes |
| Base-to-final total line changes | ~484 cumulative-touch forecast | 482 (`112` code + `370` planning-doc lines); 484 cumulative PR touch count | yes under the stated convention |
| Within 400-line budget (code only) | yes | yes — 112 base-to-final changed lines / 114 cumulative touches | yes |

## Risks observed

- **Blocking**: `REQ-UI-13` final static check requires at least one pink-400 utility, but there are no pink utility matches in `src/` or `app/`, and Tailwind correctly omits `pink-400` from the 7,775-byte CSS bundle.
- **Blocking**: `REQ-UI-17` spec/tasks/design show `amountColorClass(amount, threshold?)`, including warning and alert behavior, while merged `MacroGrid.tsx:13-17` implements only sign mapping. The current `MacroGridProps` has no threshold metadata, so the contract must either add an explicit documented threshold source or revise the delta/task acceptance criteria before rerun.
- **Non-blocking**: `next build` emits the existing ESLint-plugin detection warning despite successful compilation and exit 0.
- **Pending archive**: canonical REQ-UI-5 has intentionally not been superseded yet; this is expected at verify time and is not counted as a failure.
- **Environment**: `pnpm` is unavailable in the runner; equivalent package-lock-backed npm commands were used, with local binaries resolved successfully.

## Next phase

`/sdd-continue fr3-ui-styling` → fix the pink/threshold contract, rerun verification, then archive only after status is PASS or an explicitly accepted warning state.

Archive will:
- Replace REQ-UI-5 in `openspec/specs/bunker-ui/spec.md` with the SUPERSEDED marker.
- Add REQ-UI-12..17 to `openspec/specs/bunker-ui/spec.md`.
- Move `openspec/changes/fr3-ui-styling/` to `openspec/changes/archive/2026-07-19-fr3-ui-styling/` via `git mv`.
- Delete the local `feat/fr3-ui-styling` and `chore/fr3-openpec-artifacts` branches and the remote ones.

## Artifacts

- engram: `sdd/fr3-ui-styling/verify-report-final` (saved after this report)
- openspec: `openspec/changes/fr3-ui-styling/verify-report-final.md` (written by this verification)
