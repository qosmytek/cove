// Compression knobs and their mapping to each engine's rate control. Dependency-free and
// tiny (pure helpers only), so the shell can read it AND the lazy engine chunks can import
// the mappings without pulling anything heavy into the entry bundle.

export type Quality = 'high' | 'balanced' | 'small';

export interface CompressOptions {
  quality: Quality; // perceptual target: 'high' looks best, 'small' is the smallest file
  height: number; // output height in px; width is derived to keep aspect ratio
  videoBitrate?: number; // bps; when set (target-size mode), overrides `quality`
}

export const QUALITIES: Quality[] = ['high', 'balanced', 'small'];

export const DEFAULT_OPTIONS: CompressOptions = { quality: 'balanced', height: 720 };

/** libx264 CRF for the ffmpeg path (lower = better quality, larger file). */
export function qualityCrf(quality: Quality): number {
  return { high: 20, balanced: 26, small: 32 }[quality];
}

/** Target bitrate (bps) for the WebCodecs path, scaled to the output resolution. */
export function qualityBitrate(quality: Quality, width: number, height: number): number {
  const base = { high: 4_000_000, balanced: 2_000_000, small: 1_000_000 }[quality];
  return Math.round(base * ((width * height) / (1280 * 720)));
}

/**
 * Approximate video bitrate (bps) to land near a target file size, reserving room for the
 * audio track. Returns 0 when inputs are unusable (caller should fall back to `quality`).
 */
export function targetBitrate(
  targetMB: number,
  durationSec: number,
  audioReserveBps = 128_000,
): number {
  if (targetMB <= 0 || durationSec <= 0) return 0;
  const totalBps = (targetMB * 8 * 1_000_000) / durationSec;
  return Math.max(100_000, Math.round(totalBps - audioReserveBps));
}
