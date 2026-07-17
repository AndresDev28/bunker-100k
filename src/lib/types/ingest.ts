/**
 * IngestResult — returned by ingestFromFolder Server Action.
 *
 * REQ-CSV-5: returns { ingested, deduped, skipped, logPath, transactionCount }.
 *
 * Note: deduped is the STORE-LEVEL count of transactions that were already
 * persisted (idempotent upsert hit). Added in W7+; before W7, ingestFromFolder
 * only ran in dry-run mode (W6).
 */
export interface IngestResult {
  /** New transactions added this run (store-level) */
  ingested: number;
  /** Duplicates skipped because they already existed in the store (hash collision) */
  deduped: number;
  /** Malformed rows skipped (logged to ingest.log) */
  skipped: number;
  /** Absolute path to ingest.log */
  logPath: string;
  /** Total transactions persisted after this run (readStore count) */
  transactionCount: number;
}
