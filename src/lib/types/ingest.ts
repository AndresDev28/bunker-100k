/**
 * IngestResult — returned by ingestFromFolder Server Action.
 *
 * REQ-CSV-5: returns { ingested, deduped, skipped, logPath, transactionCount }.
 *
 * Note: deduped in this PR is count of duplicates WITHIN the input batch,
 * not store-level (store-level arrives in W7).
 */
export interface IngestResult {
  /** New transactions added this run */
  ingested: number;
  /** Duplicates skipped within this batch (store-level dedup arrives W7) */
  deduped: number;
  /** Malformed rows skipped (logged to ingest.log) */
  skipped: number;
  /** Absolute path to ingest.log */
  logPath: string;
  /** Total transactions returned by ingestTransactions this run */
  transactionCount: number;
}
