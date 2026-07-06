import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Append-only JSON-lines writer for ingest audit trail.
 *
 * REQ-CSV-3: each skipped row appends one JSON-line to `${dataDir}/state/ingest.log`.
 * Pure IO wrapper — testable via dataDir parameter (no global state).
 */
export async function appendIngestLog(
  dataDir: string,
  event: {
    kind: string;
    file: string;
    line: number;
    reason: string;
  },
): Promise<void> {
  const logPath = path.join(dataDir, 'ingest.log');
  const line = JSON.stringify({ ...event, at: new Date().toISOString() }) + '\n';
  await fs.appendFile(logPath, line, 'utf8');
}
