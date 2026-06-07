import { describe, expect, it } from 'vitest';
import { chooseCore } from '../src/capabilities';

describe('chooseCore', () => {
  it('uses the multi-threaded core only with cross-origin isolation + SharedArrayBuffer', () => {
    expect(chooseCore({ crossOriginIsolated: true, sharedArrayBuffer: true })).toBe('mt');
  });
  it('falls back to single-threaded otherwise', () => {
    expect(chooseCore({ crossOriginIsolated: false, sharedArrayBuffer: true })).toBe('st');
    expect(chooseCore({ crossOriginIsolated: true, sharedArrayBuffer: false })).toBe('st');
    expect(chooseCore({ crossOriginIsolated: false, sharedArrayBuffer: false })).toBe('st');
  });
});
