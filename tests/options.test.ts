import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, PRESETS } from '../src/options';

describe('compression options', () => {
  it('default preset is one of the offered presets', () => {
    expect(PRESETS).toContain(DEFAULT_OPTIONS.preset);
  });
  it('has sane defaults', () => {
    expect(DEFAULT_OPTIONS.height).toBe(720);
    expect(DEFAULT_OPTIONS.crf).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_OPTIONS.crf).toBeLessThanOrEqual(51);
  });
});
