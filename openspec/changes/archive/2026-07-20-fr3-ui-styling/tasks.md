# Tasks: fr3-ui-styling — Tailwind styling on FR-2 UI surfaces

> Environment: [production] (`src/` + `app/`). `strict_tdd: true`. Single-PR (`feat/fr3-ui-styling` off `main`). Hard guard (T8): every task MUST NOT touch/edit/import `src/sandbox-bridge/frozenContracts.ts` or any FR-2-frozen prop shape.

## Work-unit grouping

Single PR; TDD applies per task.

## Tasks

### T1: Bootstrap Tailwind v3 (entry point) — REQ-UI-12 (both)
- CREATE `app/globals.css` with three v3 directives (`@tailwind base;` `components;` `utilities;`). NOT `@import "tailwindcss"`.
- EDIT `app/layout.tsx`: `import './globals.css';` at top; `<html className="dark" lang="en">`; `<body className="bg-zinc-950 text-zinc-100 min-h-screen">`.
- Done: `vitest run` + `tsc --noEmit` + `eslint .` + `prettier --check .` all pass; FR-2 net green.

### T2: Style `BunkerHeader` — REQ-UI-13, REQ-UI-15
- EDIT `src/components/BunkerHeader.tsx`: outer `flex items-center justify-between border-b border-zinc-800 px-6 py-4`; title `text-fuchsia-500 font-semibold tracking-wide`; tagline `text-zinc-400 text-sm`. D4 tokens only.
- Done: FR-2 `toContain` assertions green; gates pass.

### T3: Style `BunkerHero` — REQ-UI-14, REQ-UI-13
- EDIT `src/components/BunkerHero.tsx`: numeric wrapper `font-mono tabular-nums text-zinc-100 text-4xl sm:text-5xl font-semibold`; labels `text-zinc-400 text-sm`; bunkerTarget `text-fuchsia-500`.
- Done: every numeric container has `font-mono tabular-nums`; gates pass.

### T4: Style `MacroGrid` — REQ-UI-15, REQ-UI-17 (all 5)
- EDIT `src/components/MacroGrid.tsx`: outer `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`; card `border border-zinc-800 rounded p-4 bg-zinc-900/40`; numeric `font-mono tabular-nums`.
- Co-located helper (lives in `MacroGrid.tsx`, NOT a shared util):
  ```ts
  function amountColorClass(amount: number, threshold?: 'warning' | 'alert'): string {
    if (threshold === 'alert') return 'text-pink-400';
    if (threshold === 'warning') return 'text-fuchsia-500';
    if (amount > 0) return 'text-emerald-400';
    if (amount < 0) return 'text-red-400';
    return 'text-zinc-400';
  }
  ```
- Done: `frozenContracts.ts` BYTE-IDENTICAL to FR-2 (T8); no `tone` prop on `MacroGridProps`/`BunkerFixtures`; FR-2 net green; gates pass.

### T5: Style `AuditSplit` — REQ-UI-14, REQ-UI-15
- EDIT `src/components/AuditSplit.tsx`: outer `border-t border-zinc-800 pt-4 mt-6`; metadata rows `flex justify-between text-xs text-zinc-400 py-1`; numeric metadata (`transactionCount`, etc.) `font-mono tabular-nums`.
- Done: all four metadata fields still render; FR-2 label net green; gates pass.

### T6: Cross-surface guards + verify — REQ-UI-16, REQ-UI-17 guards
Verification-only; no code changes unless a guard fails.
- `rg -n "transition-|animate-|duration-|ease-|motion-" src/ app/` → no styled-code matches (REQ-UI-16).
- No `dark:bg-*`, `dark:text-*`, `dark:border-*` classes anywhere (REQ-UI-12 spirit).
- `git diff --stat openspec/changes/archive/2026-07-18-fr2-ui-replacement/specs/bunker-ui/spec.md` empty.
- `wc -l $(git diff --name-only main...HEAD -- 'src/**/*.tsx' 'app/**/*.tsx')` ≤ 400 lines.
- `next build` succeeds; bundle includes `fuchsia-500`, `pink-400`, `emerald-400`, `red-400`, `zinc-{400,800,950}`.
- `vitest run` + `tsc --noEmit` + `eslint .` + `prettier --check .` all pass.

## Strict-TDD Test Blocks

No new tests required. FR-2 test net (`src/components/__tests__/components.test.ts`, 439 lines, `renderToStaticMarkup` + `toContain`) tolerates class additions and element refactors when visible text is preserved; existing label assertions remain authoritative. Visual regression (snapshots / Playwright + Percy) is out of scope for FR-3.

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: n/a
400-line budget risk: Low

Forecast: ~150–250 authored lines; single PR (`feat/fr3-ui-styling` off `main`); T8 hard guard (no edits/imports/touches to `frozenContracts.ts` or any FR-2-frozen prop shape); pre-confirmed in proposal A7 + design.

## Delivery

Single PR (`feat/fr3-ui-styling` off `main`). 6 commits (T1..T5 + T6 verify), each MUST pass the 4 gates. PR body MUST clarify dynamic math replacement (`B_t = C_s × 6`, `Δ_M`, monthly averages) is a sibling change, NOT this PR, and MUST call out REQ-UI-5 supersede + REQ-UI-6 preservation. Merged via user's manual `git` workflow.

## Next phase

`/sdd-continue fr3-ui-styling` → apply.
