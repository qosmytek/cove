import { describe, expect, it } from 'vitest';
import type { Capabilities } from '../src/capabilities';
import { formatDiagnostics } from '../src/diagnostics';

const caps: Capabilities = {
  crossOriginIsolated: true,
  sharedArrayBuffer: true,
  webCodecs: false,
};
const now = new Date('2026-06-09T12:00:00.000Z');

describe('formatDiagnostics', () => {
  it('includes the timestamp, capabilities, tool details, and the log trail', () => {
    const report = formatDiagnostics(
      {
        userAgent: 'TestUA/1.0',
        caps,
        details: { 'engine (selected)': 'auto' },
        log: 'line 1\nline 2\n',
      },
      now,
    );
    expect(report).toContain('time: 2026-06-09T12:00:00.000Z');
    expect(report).toContain('userAgent: TestUA/1.0');
    expect(report).toContain('crossOriginIsolated=true sharedArrayBuffer=true webCodecs=false');
    expect(report).toContain('engine (selected): auto');
    expect(report).toContain('line 1\nline 2');
  });

  it('marks an empty log explicitly', () => {
    const report = formatDiagnostics({ userAgent: 'x', caps, log: '   ' }, now);
    expect(report).toContain('log:\n(empty)');
  });
});
