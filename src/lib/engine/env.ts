/**
 * Shared environment resolution helpers.
 *
 * REQ-READ-2: single source of truth for data dir and owner id.
 * Both loadTransactions (read) and ingestFromFolder (write) MUST
 * consume these helpers — no literal process.env.BUNKER_DATA_DIR
 * outside this module.
 */

export function resolveDataDir(): string {
  return process.env.BUNKER_DATA_DIR ?? '/data';
}

export function resolveOwnerId(): string {
  return 'self';
}
