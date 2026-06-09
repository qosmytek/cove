// Runtime capability detection. Kept free of any heavy imports so the shell can detect the
// platform surface once — and decide which engine to offer (and disclose its size) — before
// loading any tool. Tools read this via ToolContext.caps; the map grows as tools need flags.

export type CoreKind = 'mt' | 'st';

export interface Capabilities {
  crossOriginIsolated: boolean;
  sharedArrayBuffer: boolean;
  webCodecs: boolean;
}

/** Approximate one-time engine download size per core, for up-front disclosure. */
export const CORE_APPROX_MB: Record<CoreKind, number> = { mt: 32, st: 31 };

export function detectCapabilities(): Capabilities {
  return {
    crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    webCodecs: typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined',
  };
}

/** Multi-threaded core needs SharedArrayBuffer, which needs cross-origin isolation. */
export function chooseCore(
  caps: Pick<Capabilities, 'crossOriginIsolated' | 'sharedArrayBuffer'> = detectCapabilities(),
): CoreKind {
  return caps.crossOriginIsolated && caps.sharedArrayBuffer ? 'mt' : 'st';
}
