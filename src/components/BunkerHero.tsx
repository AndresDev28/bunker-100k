/**
 * BunkerHero — production component (FR-2).
 *
 * REQ-UI-1: lives in src/components/, importable via @/components/*.
 * REQ-UI-2: derives progressPercent internally (not a prop — A7 trimmed).
 * REQ-UI-5: un-styled — bare semantic HTML, no Tailwind classes.
 * A2: all visible strings from @/lib/labels (microProgress, microSurvivalCost).
 */
import React, { type ReactNode } from 'react';
import type { BunkerHeroProps } from '@/sandbox-bridge/frozenContracts';
import { microProgress, microSurvivalCost } from '@/lib/labels';

export function BunkerHero(props: BunkerHeroProps): ReactNode {
  const { bunkerTarget, currentCash, monthsRemaining, survivalMonthlyCost } = props;

  // D4: progressPercent derived internally, not a prop
  const progressPercent = bunkerTarget > 0 ? (currentCash / bunkerTarget) * 100 : 0;

  return (
    <section>
      <h1>{bunkerTarget.toLocaleString()} €</h1>
      <div>
        <div style={{ width: `${progressPercent}%` }} />
      </div>
      <p>
        <small>{microProgress(progressPercent, monthsRemaining)}</small>
      </p>
      <p>
        <span>{microSurvivalCost(survivalMonthlyCost)}</span>
      </p>
    </section>
  );
}
