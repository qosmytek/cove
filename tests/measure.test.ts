import { describe, expect, it } from 'vitest';
import { formatBytes, reductionPct } from '../src/measure';

describe('reductionPct', () => {
  it('reports how much smaller the output is', () => {
    expect(reductionPct(100, 25)).toBe(75);
    expect(reductionPct(1000, 500)).toBe(50);
  });
  it('is 0 for a zero-byte input (no divide-by-zero)', () => {
    expect(reductionPct(0, 0)).toBe(0);
  });
});

describe('formatBytes', () => {
  it('formats B / KB / MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1_572_864)).toBe('1.5 MB');
  });
});
