/**
 * env.ts — shared environment resolution helpers.
 *
 * REQ-READ-2: single resolveDataDir() + resolveOwnerId() used by both
 * loadTransactions (read) and ingestFromFolder (write). No literal
 * process.env.BUNKER_DATA_DIR outside this module.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveDataDir, resolveOwnerId } from '../env';

describe('env helpers', () => {
  const originalEnv = process.env.BUNKER_DATA_DIR;

  beforeEach(() => {
    delete process.env.BUNKER_DATA_DIR;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.BUNKER_DATA_DIR = originalEnv;
    } else {
      delete process.env.BUNKER_DATA_DIR;
    }
  });

  it('resolveDataDir defaults to /data when BUNKER_DATA_DIR unset', () => {
    expect(resolveDataDir()).toBe('/data');
  });

  it('resolveDataDir returns env override when BUNKER_DATA_DIR is set', () => {
    process.env.BUNKER_DATA_DIR = '/srv/bunker';
    expect(resolveDataDir()).toBe('/srv/bunker');
  });

  it('resolveOwnerId defaults to self', () => {
    expect(resolveOwnerId()).toBe('self');
  });
});
