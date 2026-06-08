import { describe, expect, it } from 'vitest';
import { capabilityNote, friendlyError } from '../src/errors';

describe('friendlyError', () => {
  it('maps a declined download', () => {
    expect(friendlyError('ffmpeg download declined')).toMatch(/download/i);
  });
  it('maps out-of-memory', () => {
    expect(friendlyError('Out of memory: allocation failed')).toMatch(/too large/i);
  });
  it('maps an unreadable input', () => {
    expect(friendlyError('no H.264 video track found')).toMatch(/unsupported format|corrupted/i);
  });
  it('falls back to a generic message', () => {
    expect(friendlyError('something weird happened')).toMatch(/something went wrong/i);
  });
});

describe('capabilityNote', () => {
  it('prefers the hardware path', () => {
    expect(capabilityNote(true, false)).toMatch(/hardware/i);
  });
  it('notes the downloadable engine when WebCodecs is unavailable', () => {
    expect(capabilityNote(false, true)).toMatch(/downloadable engine/i);
  });
  it('flags compatibility mode with no isolation', () => {
    expect(capabilityNote(false, false)).toMatch(/compatibility/i);
  });
});
