// Telemetry-free quality monitoring: assemble a copyable, on-device diagnostics report for
// voluntary bug reports. Nothing here is ever transmitted — the user reviews the text and
// chooses where to paste it (ADR-0005: no server, no tracking). Pure and deterministic so it
// can be unit-tested; a tool wires it to a "Copy diagnostics" affordance.
import type { Capabilities } from './capabilities';

export interface DiagnosticsInput {
  userAgent: string;
  caps: Capabilities;
  /** Tool-specific key/value details (e.g. the selected engine). */
  details?: Record<string, string>;
  /** Recent in-app log lines — the failure trail. */
  log: string;
}

export function formatDiagnostics(input: DiagnosticsInput, now: Date = new Date()): string {
  const { userAgent, caps, details = {}, log } = input;
  const lines = [
    'Cove diagnostics',
    `time: ${now.toISOString()}`,
    `userAgent: ${userAgent}`,
    `capabilities: crossOriginIsolated=${caps.crossOriginIsolated}` +
      ` sharedArrayBuffer=${caps.sharedArrayBuffer} webCodecs=${caps.webCodecs}`,
  ];
  for (const [key, value] of Object.entries(details)) lines.push(`${key}: ${value}`);
  lines.push('', 'log:', log.trim() || '(empty)');
  return lines.join('\n');
}
