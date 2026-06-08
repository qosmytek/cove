import { describe, expect, it } from 'vitest';
import { aacLcAsc } from '../src/aac';

describe('aacLcAsc', () => {
  it('builds the canonical AAC-LC config for 44.1 kHz stereo (0x12 0x10)', () => {
    expect(Array.from(aacLcAsc(44100, 2) ?? [])).toEqual([0x12, 0x10]);
  });
  it('builds the canonical AAC-LC config for 48 kHz stereo (0x11 0x90)', () => {
    expect(Array.from(aacLcAsc(48000, 2) ?? [])).toEqual([0x11, 0x90]);
  });
  it('encodes mono (1 channel) at 44.1 kHz', () => {
    expect(Array.from(aacLcAsc(44100, 1) ?? [])).toEqual([0x12, 0x08]);
  });
  it('returns undefined for a non-standard sample rate', () => {
    expect(aacLcAsc(12345, 2)).toBeUndefined();
  });
});
