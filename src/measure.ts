// Lightweight measurement helpers for the Phase 0 go/no-go. See
// docs/engineering/phase-0-measurement.md.

import type { CoreKind } from './capabilities';

export interface CompressMetrics {
  core: CoreKind;
  inputBytes: number;
  outputBytes: number;
  reductionPct: number;
  loadMs: number;
  encodeMs: number;
  peakHeapMB?: number;
}

export function reductionPct(inputBytes: number, outputBytes: number): number {
  if (inputBytes <= 0) return 0;
  return Math.round((1 - outputBytes / inputBytes) * 1000) / 10;
}

/**
 * Best-effort heap usage (Chrome-only and coarse — this is the JS heap, NOT total
 * WASM/linear memory, so treat it as a rough peak indicator only).
 */
export function heapMB(): number | undefined {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? Math.round(mem.usedJSHeapSize / 1048576) : undefined;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
