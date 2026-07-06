import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('boots', () => {
    expect(1 + 1).toBe(2);
  });

  it('true is true', () => {
    expect(true).toBe(true);
  });
});
