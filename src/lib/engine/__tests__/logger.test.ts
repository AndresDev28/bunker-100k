import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { appendIngestLog } from '@/lib/engine/logger';

describe('appendIngestLog', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ingest-log-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('appends one JSON-line event to ingest.log', async () => {
    const event = { kind: 'skip' as const, file: 'foo.csv', line: 5, reason: 'unparseable date' };
    await appendIngestLog(tmpDir, event);

    const logPath = path.join(tmpDir, 'ingest.log');
    const content = await fs.readFile(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.kind).toBe('skip');
    expect(parsed.file).toBe('foo.csv');
    expect(parsed.line).toBe(5);
    expect(parsed.reason).toBe('unparseable date');
  });

  it('appends multiple JSON-line events sequentially', async () => {
    const events = [
      { kind: 'skip' as const, file: 'a.csv', line: 1, reason: 'missing-amount' },
      { kind: 'skip' as const, file: 'b.csv', line: 3, reason: 'unparseable-date' },
      { kind: 'skip' as const, file: 'c.csv', line: 7, reason: 'unknown' },
    ];
    for (const ev of events) {
      await appendIngestLog(tmpDir, ev);
    }

    const logPath = path.join(tmpDir, 'ingest.log');
    const content = await fs.readFile(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(3);
    for (let i = 0; i < events.length; i++) {
      const parsed = JSON.parse(lines[i]!);
      expect(parsed.file).toBe(events[i]!.file);
      expect(parsed.line).toBe(events[i]!.line);
      expect(parsed.reason).toBe(events[i]!.reason);
    }
  });

  it('is append-only: writing again does not truncate existing lines', async () => {
    const event1 = { kind: 'skip' as const, file: 'x.csv', line: 1, reason: 'a' };
    const event2 = { kind: 'skip' as const, file: 'y.csv', line: 2, reason: 'b' };
    await appendIngestLog(tmpDir, event1);
    await appendIngestLog(tmpDir, event2);

    const logPath = path.join(tmpDir, 'ingest.log');
    const content = await fs.readFile(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]!);
    const second = JSON.parse(lines[1]!);
    expect(first.file).toBe('x.csv');
    expect(second.file).toBe('y.csv');
  });
});
