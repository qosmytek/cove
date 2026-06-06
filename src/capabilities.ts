// Runtime capability detection. Kept free of any heavy imports so the shell can
// decide which engine to offer (and disclose its size) before loading anything.

export type CoreKind = 'mt' | 'st';

export interface Capabilities {
  crossOriginIsolated: boolean;
  sharedArrayBuffer: boolean;
}

/** Approximate one-time engine download size per core, for up-front disclosure. */
export const CORE_APPROX_MB: Record<CoreKind, number> = { mt: 32, st: 31 };

export function detectCapabilities(): Capabilities {
  return {
    crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
  };
}

/** Multi-threaded core needs SharedArrayBuffer, which needs cross-origin isolation. */
export function chooseCore(caps: Capabilities = detectCapabilities()): CoreKind {
  return caps.crossOriginIsolated && caps.sharedArrayBuffer ? 'mt' : 'st';
}
