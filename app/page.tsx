/**
 * app/page.tsx — async Server Component (FR-2).
 *
 * REQ-UI-4: thin SC — loadTransactions (REQ-READ-1) → buildBunkerViewModel
 * (REQ-AGG-1) → render the four production components.
 * REQ-UI-5: un-styled — bare semantic HTML, no Tailwind classes.
 * A5: no globals.css import, no dark class.
 *
 * When the store is empty, loadTransactions returns [] → buildBunkerViewModel
 * produces a valid zero-state BunkerFixtures → all four components render
 * without throwing (REQ-AGG-5).
 */
import React from 'react';
import { loadTransactions } from '@/app/actions/loadTransactions';
import { buildBunkerViewModel } from '@/lib/engine/buildBunkerViewModel';
import { BunkerHeader } from '@/components/BunkerHeader';
import { BunkerHero } from '@/components/BunkerHero';
import { MacroGrid } from '@/components/MacroGrid';
import { AuditSplit } from '@/components/AuditSplit';

// Force dynamic rendering — the page reads from the filesystem (loadTransactions),
// which is not available at build time. Next.js would otherwise attempt to prerender
// this page during `next build` and fail with EACCES on /data.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const transactions = await loadTransactions();
  const fixtures = buildBunkerViewModel(transactions);

  return (
    <main>
      <BunkerHeader {...fixtures.header} />
      <BunkerHero {...fixtures.hero} />
      <MacroGrid {...fixtures.macroGrid} />
      <AuditSplit {...fixtures.auditSplit} />
    </main>
  );
}
