/**
 * Shared environment resolution helpers.
 *
 * REQ-READ-2: single source of truth for data dir and owner id.
 * Both loadTransactions (read) and ingestFromFolder (write) MUST
 * consume these helpers — no literal process.env.BUNKER_DATA_DIR
 * outside this module.
 */

/**
 * Resolve the Bunker data directory.
 *
 * Precedence:
 *   1. BUNKER_DATA_DIR env var (production operators set this explicitly).
 *   2. Fallback: `<process.cwd()>/data` — a project-local path so
 *      `npm run dev` works out of the box without root privileges.
 *
 * The fallback uses process.cwd() (not __dirname) so the path resolves
 * relative to where the developer runs the dev server, not relative to
 * this module's compiled location.
 */
export function resolveDataDir(): string {
  return process.env.BUNKER_DATA_DIR ?? `${process.cwd()}/data`;
}

export function resolveOwnerId(): string {
  return 'self';
}
