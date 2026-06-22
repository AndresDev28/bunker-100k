# Specification Document: BKR-100 (Bunker Financial Engine)

## 1. Project Overview
* **System Name:** `BKR-100`
* **Architecture:** Local-first Web Application & CLI Parser.
* **Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Jest/Vitest (TDD Suite).
* * **Core Objective:** Extract, clean, and audit banking CSV data with an open-ended dynamic timeframe. The engine calculates the exact date bounds ($T_{\text{start}}$ to $T_{\text{end}}$) directly from the processed dataset to normalize all averages relative to the real elapsed time, mathematically isolating the 6-month Bunker Target.

---

## 2. Core Functional Requirements (FR)

### FR-0: Wireframing Sandbox (Pre-SDD Validation)
Before initializing the Next.js production codebase, the agent must orchestrate a rapid prototyping sandbox using ReactJS + Vite.

1. **Scope:** This sandbox serves exclusively to validate the structural layout and content distribution of the application.
2. **Styling Constraint:** Zero styling allowed. No Tailwind, no custom CSS, no colors. The agent must use raw HTML semantic tags (`<div>`, `<section>`, `<h1>`, `<p>`, `<table>`) with standard browser borders (`border: 1px solid`) to form a wireframe skeleton.
3. **Components to Render:**
   * `BunkerHeader`: Minimal text navigation and status.
   * `BunkerHero`: Placeholder for the 6-Month Target metric and the structural layout of the timeline.
   * `MacroGrid`: A 3-column raw layout for Income, Wants, and Save Rate.
   * `AuditSplit`: A 2-column layout representing the breakdown grids.
4. **Lifecycle:** Once the wireframe distribution is verified visually by the user in the local Vite server, this sandbox can be archived, and the layout blueprint will be migrated to the production Next.js environment.

### FR-1: Idempotent CSV Ingestion & Deduplication
* **Input:** The system must scan a local folder `/data/raw` or receive files via a drag-and-drop zone.
* **Deduplication Engine:** To prevent data skewing due to overlapping statement downloads, every single transaction must generate a unique identifier hash:
  $$\text{Transaction Hash} = \text{SHA-256}(\text{Date} + \text{Cleaned\_Description} + \text{Amount})$$
* **Storage Logic:** The system must check the incoming hash against the existing local JSON/state database. If the hash matches, the transaction is skipped (`idempotent operation`).

### FR-2: Two-Tier Cognitive Classification Matrix
The system must parse the `Cleaned_Description` string using rigid Regex/Keyword dictionaries and map them into a two-tier database schema:

1. **INCOME (Ingresos)**
   * `salary`: Payroll, recurring incoming transfers.
2. **SURVIVAL COSTS (Needs)**
   * `housing`: Rent, mortgage, community fees.
   * `groceries`: Supermarkets, core food supply.
   * `utilities`: Electricity, water, internet, gas.
   * `liabilities`: Non-negotiable monthly debt baselines (car loans, credit cards, personal loans).
3. **OPTIMIZATION ZONE (Wants / Superfluous)**
   * `restoration`: Restaurants, bars, delivery apps (Glovo, UberEats).
   * `subscriptions`: Entertainment streaming, non-essential software.
   * `variables`: Clothing, tech gadgets, Amazon non-core purchases.

*Fallback Rule:* Any unmapped negative transaction must be strictly classified under `Wants.variables` to force transparency.

### FR-3: Dynamic Time Normalization & Financial Math
The engine must not assume a fixed month count. It must compute the precise time delta from the unique dataset:

1. **Time Delta Calculation ($\Delta_M$):**
   $$\Delta_M = \frac{T_{\text{end}} - T_{\text{start}}}{\text{30.44 days}}$$
   *Where $T_{\text{end}}$ is the newest transaction timestamp, $T_{\text{start}}$ is the oldest, and 30.44 is the average days in a month.*

2. **Dynamically Scaled Monthly Averages:**
   For any category or subcategory, the monthly average ($\overline{X}$) is computed as:
   $$\overline{X} = \frac{\sum \text{Amounts of } X}{\Delta_M}$$

3. **Bunker Target ($B_t$):**
   $$C_s = \overline{\text{housing}} + \overline{\text{groceries}} + \overline{\text{utilities}} + \overline{\text{liabilities}}$$
   $$B_t = C_s \times 6$$

---

## 3. UI/UX Interface Specification (BKR-100 Dark Minimalist)
The local client running on `http://localhost:3000` must mirror the high-precision dark interface:

### Component 1: Hero Bunker Card (Full Width)
* **Title:** "BUNKER TARGET (6-MONTH EMERGENCY FUND)"
* **Primary Metric:** Display $B_t$ prominently (e.g., `€ 8,400.00`).
* **Progress Bar:** A thin geometric line indicating current cash vs. target.
* **Micro-metadata:** Display `[XX%] | X.X months remaining to safety` and `*Survival Monthly Cost: X,XXX €/mo`.

### Component 2: The Macro KPI Grid (3 Columns)
* **Card 1 (Income Medios):** Average monthly income + trend mini-chart (green accent line).
* **Card 2 (Wants / Superfluous):** Average monthly waste + trend mini-chart (magenta/crimson accent line + warning icon).
* **Card 3 (Save Rate):** Active savings percentage + stability trendline.

### Component 3: Split Audit View (2 Columns)
* **Left Column (Survival Breakdown - Needs):** Vertical list displaying subcategories (`Housing`, `Groceries`, `Liabilities`, `Utilities`) ordered by volume. Include smooth Tailwind-shaded horizontal bars in slate blue.
* **Right Column (Optimization Zone - Wants):** Vertical list displaying subcategories (`Restoration`, `Variables`, `Subscriptions`). Include horizontal shading bars in deep pink/magenta. 
* **Footer Label:** `*Optimization potential: +XXX €/mo` (Sum of all Wants).

---

## 4. Test-Driven Development (TDD) Targets
The CLI agent will reject any implementation where the following test blocks do not pass natively:

```typescript
describe("BKR-100 Data Integrity Engine", () => {
  it("should enforce idempotency by discarding identical SHA-256 hashes", () => {
    // Test that parsing the same CSV line twice results in 1 recorded transaction.
  });

  it("should strictly isolate Wants from the Bunker Target formula", () => {
    // Test that if Needs = 1400 and Wants = 600, the 6-month target is exactly 8400, not 12000.
  });

  it("should classify ambiguous terms to Wants.variables automatically", () => {
    // Test fallback rule mechanism.
  });
});
