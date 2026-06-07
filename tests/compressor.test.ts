import { describe, expect, it } from 'vitest';
import { chooseEngine, webCodecsSupported } from '../src/compressor';

describe('chooseEngine', () => {
  it('prefers WebCodecs when available (auto)', () => {
    expect(chooseEngine('auto', true)).toBe('webcodecs');
  });
  it('falls back to ffmpeg.wasm when WebCodecs is unavailable (auto)', () => {
    expect(chooseEngine('auto', false)).toBe('ffmpeg.wasm');
  });
  it('honors an explicit override regardless of availability', () => {
    expect(chooseEngine('ffmpeg.wasm', true)).toBe('ffmpeg.wasm');
    expect(chooseEngine('webcodecs', false)).toBe('webcodecs');
  });
});

describe('webCodecsSupported', () => {
  it('is false where the WebCodecs API is absent (e.g. Node)', async () => {
    expect(await webCodecsSupported()).toBe(false);
  });
});
