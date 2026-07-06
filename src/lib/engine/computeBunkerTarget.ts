/**
 * FR-1 stub: returns SurvivalMonthlyCost * 6 (Wants strictly isolated).
 * FR-3 will replace this body with the full delta_M + per-tier aggregation.
 *
 * @param survivalMonthlyCost - the monthly survival cost (needs tier only)
 * @param wantsTotal          - FR-1: intentionally ignored. The 2nd arg exists so
 *                              the Wants-isolation invariant is visible at every
 *                              call site. DO NOT remove this parameter in FR-3 —
 *                              instead mark it `unused` and bring it back into the
 *                              formula once FR-3 lands the full aggregation.
 *
 * REQ-DEDUP-5: Bt = SurvivalMonthlyCost × 6; wantsTotal has zero effect.
 * Spec §4 block 2 gate: computeBunkerTarget(1400, 600) === 8400 AND !== 12000.
 */
export function computeBunkerTarget(survivalMonthlyCost: number, wantsTotal: number): number {
  void wantsTotal;
  return survivalMonthlyCost * 6;
}
