import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPTIONS,
  QUALITIES,
  qualityBitrate,
  qualityCrf,
  targetBitrate,
} from '../src/options';

describe('compression options', () => {
  it('default quality is one of the offered qualities', () => {
    expect(QUALITIES).toContain(DEFAULT_OPTIONS.quality);
  });
  it('default height is 720', () => {
    expect(DEFAULT_OPTIONS.height).toBe(720);
  });
  it('qualityCrf is ordered (higher quality = lower CRF) and in range', () => {
    expect(qualityCrf('high')).toBeLessThan(qualityCrf('balanced'));
    expect(qualityCrf('balanced')).toBeLessThan(qualityCrf('small'));
    expect(qualityCrf('small')).toBeLessThanOrEqual(51);
  });
  it('qualityBitrate is ordered and scales with resolution', () => {
    expect(qualityBitrate('high', 1280, 720)).toBeGreaterThan(qualityBitrate('small', 1280, 720));
    expect(qualityBitrate('balanced', 1920, 1080)).toBeGreaterThan(
      qualityBitrate('balanced', 1280, 720),
    );
  });
  it('targetBitrate scales inversely with duration, reserves audio, and floors at 0', () => {
    expect(targetBitrate(10, 30)).toBeGreaterThan(targetBitrate(10, 60));
    expect(targetBitrate(0, 60)).toBe(0);
    expect(targetBitrate(10, 0)).toBe(0);
  });
});
