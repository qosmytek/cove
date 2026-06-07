// The heavy module: pulls in ffmpeg.wasm. It is imported **dynamically** from main.ts
// (only after the user clicks Compress and accepts the size disclosure), so it is
// code-split out of the initial bundle — nothing here loads on page load.

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { CoreKind } from './capabilities';
import type { CompressOptions } from './options';

export interface LoadHandlers {
  onLog?: (line: string) => void;
  onProgress?: (ratio: number) => void;
}

// Cores are vendored same-origin under /ffmpeg/ (copied from node_modules by
// scripts/copy-ffmpeg-core.mjs) so they satisfy COEP `require-corp`.
const CORE_BASE: Record<CoreKind, string> = {
  mt: '/ffmpeg/core-mt',
  st: '/ffmpeg/core-st',
};

export async function loadEngine(kind: CoreKind, handlers: LoadHandlers = {}): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  const { onLog, onProgress } = handlers;
  if (onLog) ffmpeg.on('log', ({ message }) => onLog(message));
  if (onProgress) ffmpeg.on('progress', ({ progress }) => onProgress(progress));

  const base = CORE_BASE[kind];
  const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript');
  const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm');

  if (kind === 'mt') {
    const workerURL = await toBlobURL(`${base}/ffmpeg-core.worker.js`, 'text/javascript');
    await ffmpeg.load({ coreURL, wasmURL, workerURL });
  } else {
    await ffmpeg.load({ coreURL, wasmURL });
  }
  return ffmpeg;
}

/** The representative Phase 0 job: scale to the chosen height, re-encode H.264 + AAC. */
export async function compress(
  ffmpeg: FFmpeg,
  file: File,
  opts: CompressOptions,
): Promise<Uint8Array<ArrayBuffer>> {
  const input = 'input';
  const output = 'output.mp4';
  await ffmpeg.writeFile(input, await fetchFile(file));
  await ffmpeg.exec([
    '-i',
    input,
    '-vf',
    `scale=-2:${opts.height}`,
    '-c:v',
    'libx264',
    '-preset',
    opts.preset,
    '-crf',
    String(opts.crf),
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-y',
    output,
  ]);
  const data = await ffmpeg.readFile(output);
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  // Copy into a fresh (non-shared) ArrayBuffer so callers can build a Blob/object URL
  // without SharedArrayBuffer typing friction from the multi-threaded core.
  const result = new Uint8Array(bytes.byteLength);
  result.set(bytes);
  return result;
}
