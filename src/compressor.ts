// Engine orchestrator: pick WebCodecs (hardware) or ffmpeg.wasm (fallback) by
// capability, run the compression, and handle fallback, single-threaded retry, and
// cancellation. Both engines are imported dynamically, so neither is in the entry bundle.

import { chooseCore } from './capabilities';
import type { CompressOptions } from './options';

export type EngineKind = 'webcodecs' | 'ffmpeg.wasm';
export type EngineChoice = 'auto' | EngineKind;

export interface CompressHandlers {
  onLog?: (line: string) => void;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
  /** Called before the (large) ffmpeg.wasm core downloads; return false to decline (FR-V6). */
  confirmFfmpegDownload?: () => boolean | Promise<boolean>;
}

export interface CompressResult {
  data: Uint8Array<ArrayBuffer>;
  engine: EngineKind;
}

/** Pure decision: which engine to try first. */
export function chooseEngine(choice: EngineChoice, webCodecsAvailable: boolean): EngineKind {
  if (choice !== 'auto') return choice;
  return webCodecsAvailable ? 'webcodecs' : 'ffmpeg.wasm';
}

/**
 * Whether the WebCodecs H.264 path is usable here. `isConfigSupported` reports
 * capability, not guaranteed hardware (ADR-0007) — actual speed is a device check.
 */
export async function webCodecsSupported(): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoDecoder === 'undefined') return false;
  try {
    const res = await VideoEncoder.isConfigSupported({
      codec: 'avc1.42001f',
      width: 1280,
      height: 720,
      bitrate: 2_000_000,
      framerate: 30,
      hardwareAcceleration: 'prefer-hardware',
    });
    return res.supported === true;
  } catch {
    return false;
  }
}

const isAbort = (signal?: AbortSignal): boolean => signal?.aborted === true;

export async function compress(
  file: File,
  options: CompressOptions,
  handlers: CompressHandlers = {},
  choice: EngineChoice = 'auto',
): Promise<CompressResult> {
  const { onLog, onProgress, signal } = handlers;

  if (chooseEngine(choice, await webCodecsSupported()) === 'webcodecs') {
    try {
      const { compressWebCodecs } = await import('./webcodecs-pipeline');
      const data = await compressWebCodecs(file, options, { onLog, onProgress, signal });
      return { data, engine: 'webcodecs' };
    } catch (err) {
      // A forced choice or a user cancellation must not silently fall back.
      if (isAbort(signal) || choice === 'webcodecs') throw err;
      onLog?.(
        `WebCodecs path failed (${err instanceof Error ? err.message : String(err)}); ` +
          'falling back to ffmpeg.wasm…',
      );
    }
  }

  // ffmpeg.wasm path — disclose the large one-time download first (FR-V6).
  if (handlers.confirmFfmpegDownload && !(await handlers.confirmFfmpegDownload())) {
    throw new DOMException('ffmpeg download declined', 'AbortError');
  }
  const { runFfmpeg } = await import('./engine');
  const core = chooseCore();
  try {
    const data = await runFfmpeg(file, options, { onLog, onProgress, signal, core });
    return { data, engine: 'ffmpeg.wasm' };
  } catch (err) {
    // Retry single-threaded if a multi-threaded run crashed (and it wasn't a cancel).
    if (isAbort(signal) || core !== 'mt') throw err;
    onLog?.(
      `Multi-threaded ffmpeg failed (${err instanceof Error ? err.message : String(err)}); ` +
        'retrying single-threaded…',
    );
    const data = await runFfmpeg(file, options, { onLog, onProgress, signal, core: 'st' });
    return { data, engine: 'ffmpeg.wasm' };
  }
}
