// Engine orchestrator: pick WebCodecs (hardware) or ffmpeg.wasm (fallback) by
// capability, run the compression, and handle fallback, single-threaded retry, and
// cancellation. The ffmpeg engine loads dynamically and WebCodecs runs in a Worker, so neither
// (nor mp4box) sits in the entry bundle or on the main thread.

import { chooseCore } from './capabilities';
import type { CompressOptions } from './options';
import type { WorkerIn, WorkerOut } from './webcodecs-worker';

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

/** Run the WebCodecs pipeline in a Worker; bridge its messages to the handlers (FR-P3). */
function runWebCodecsWorker(
  file: File,
  options: CompressOptions,
  handlers: CompressHandlers,
): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./webcodecs-worker.ts', import.meta.url), {
      type: 'module',
    });
    const onAbort = (): void => worker.postMessage({ type: 'abort' } satisfies WorkerIn);
    handlers.signal?.addEventListener('abort', onAbort, { once: true });
    const finish = (): void => {
      handlers.signal?.removeEventListener('abort', onAbort);
      worker.terminate();
    };
    worker.addEventListener('message', (event: MessageEvent<WorkerOut>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'progress':
          handlers.onProgress?.(msg.value);
          break;
        case 'log':
          handlers.onLog?.(msg.line);
          break;
        case 'done':
          finish();
          resolve(new Uint8Array(msg.data));
          break;
        case 'error':
          finish();
          reject(new Error(msg.message));
          break;
      }
    });
    worker.addEventListener('error', (event) => {
      finish();
      reject(new Error(event.message || 'WebCodecs worker error'));
    });
    worker.postMessage({ type: 'start', file, options } satisfies WorkerIn);
  });
}

export async function compress(
  file: File,
  options: CompressOptions,
  handlers: CompressHandlers = {},
  choice: EngineChoice = 'auto',
): Promise<CompressResult> {
  const { onLog, onProgress, signal } = handlers;

  if (chooseEngine(choice, await webCodecsSupported()) === 'webcodecs') {
    try {
      const data = await runWebCodecsWorker(file, options, handlers);
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
