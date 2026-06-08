// Runs the WebCodecs pipeline off the main thread (FR-P3). The pipeline is unchanged and
// already worker-safe (OffscreenCanvas, no DOM); this only bridges postMessage <-> the
// pipeline's handlers/AbortSignal. mp4box + mp4-muxer live in this worker chunk, not the shell.

import type { CompressOptions } from './options';
import { compressWebCodecs } from './webcodecs-pipeline';

export type WorkerIn = { type: 'start'; file: File; options: CompressOptions } | { type: 'abort' };
export type WorkerOut =
  | { type: 'progress'; value: number }
  | { type: 'log'; line: string }
  | { type: 'done'; data: ArrayBuffer }
  | { type: 'error'; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let controller: AbortController | null = null;

ctx.addEventListener('message', (event: MessageEvent<WorkerIn>) => {
  const msg = event.data;
  if (msg.type === 'abort') {
    controller?.abort();
    return;
  }
  controller = new AbortController();
  compressWebCodecs(msg.file, msg.options, {
    onLog: (line) => ctx.postMessage({ type: 'log', line } satisfies WorkerOut),
    onProgress: (value) => ctx.postMessage({ type: 'progress', value } satisfies WorkerOut),
    signal: controller.signal,
  })
    .then((result) => {
      const buffer = result.buffer;
      ctx.postMessage({ type: 'done', data: buffer } satisfies WorkerOut, [buffer]);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      ctx.postMessage({ type: 'error', message } satisfies WorkerOut);
    });
});
