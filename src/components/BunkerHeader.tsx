/**
 * BunkerHeader — production component (FR-2).
 *
 * REQ-UI-1: lives in src/components/, importable via @/components/*.
 * REQ-UI-5: un-styled — bare semantic HTML, no Tailwind classes.
 * A2: all visible strings from @/lib/labels (title comes from props, set by aggregate).
 */
import React, { type ReactNode } from 'react';
import type { BunkerHeaderProps } from '@/sandbox-bridge/frozenContracts';

export function BunkerHeader({ title, status }: BunkerHeaderProps): ReactNode {
  return (
    <header>
      <h3>{title}</h3>
      <span>{status}</span>
    </header>
  );
}
