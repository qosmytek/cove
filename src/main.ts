// Phase 0 shell. Stays light: capability detection + UI wiring only. The ffmpeg
// engine is imported dynamically on intent (see engine.ts).

import { detectCapabilities, chooseCore, CORE_APPROX_MB } from './capabilities';
import { reductionPct, heapMB, formatBytes, type CompressMetrics } from './measure';

const byId = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const statusEl = byId<HTMLParagraphElement>('status');
const fileInput = byId<HTMLInputElement>('file');
const compressBtn = byId<HTMLButtonElement>('compress');
const cancelBtn = byId<HTMLButtonElement>('cancel');
const progressEl = byId<HTMLProgressElement>('progress');
const logEl = byId<HTMLPreElement>('log');
const resultEl = byId<HTMLDivElement>('result');

const caps = detectCapabilities();
const core = chooseCore(caps);
statusEl.textContent =
  `crossOriginIsolated: ${caps.crossOriginIsolated} · SharedArrayBuffer: ${caps.sharedArrayBuffer} · ` +
  `engine: ${core === 'mt' ? 'multi-threaded' : 'single-threaded (fallback)'}`;

let selectedFile: File | null = null;
let running: { terminate: () => void } | null = null;

function log(line: string): void {
  logEl.textContent += `${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

fileInput.addEventListener('change', () => {
  selectedFile = fileInput.files?.[0] ?? null;
  compressBtn.disabled = !selectedFile;
  resultEl.textContent = '';
});

compressBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  const file = selectedFile;

  // Disclose the one-time engine size BEFORE loading any engine code.
  const proceed = confirm(
    `This downloads the ~${CORE_APPROX_MB[core]} MB compression engine once (then cached) and runs ` +
      `entirely on your device — nothing is uploaded. Continue?`,
  );
  if (!proceed) return;

  compressBtn.disabled = true;
  cancelBtn.disabled = false;
  progressEl.value = 0;
  const t0 = performance.now();

  try {
    log(`Loading ${core === 'mt' ? 'multi-threaded' : 'single-threaded'} engine…`);
    const { loadEngine, compress } = await import('./engine');
    const ffmpeg = await loadEngine(core, {
      onLog: (m) => log(m),
      onProgress: (r) => { progressEl.value = Math.max(0, Math.min(1, r)); },
    });
    running = ffmpeg;
    log('Engine loaded. Compressing…');

    const output = await compress(ffmpeg, file);
    const elapsedMs = Math.round(performance.now() - t0);
    const metrics: CompressMetrics = {
      core,
      inputBytes: file.size,
      outputBytes: output.byteLength,
      reductionPct: reductionPct(file.size, output.byteLength),
      elapsedMs,
      peakHeapMB: heapMB(),
    };

    const url = URL.createObjectURL(new Blob([output], { type: 'video/mp4' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `compressed-${file.name.replace(/\.[^.]+$/, '')}.mp4`;
    link.textContent = `Download result (${formatBytes(metrics.outputBytes)})`;
    resultEl.replaceChildren(link);

    log(
      `Done in ${(elapsedMs / 1000).toFixed(1)}s · ${formatBytes(metrics.inputBytes)} → ` +
        `${formatBytes(metrics.outputBytes)} (${metrics.reductionPct}% smaller)` +
        (metrics.peakHeapMB ? ` · heap ~${metrics.peakHeapMB} MB` : ''),
    );
    console.table(metrics);
  } catch (err) {
    log(`Error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    progressEl.value = 0;
    compressBtn.disabled = false;
    cancelBtn.disabled = true;
    running = null;
  }
});

cancelBtn.addEventListener('click', () => {
  if (!running) return;
  running.terminate();
  running = null;
  log('Cancelled.');
  compressBtn.disabled = false;
  cancelBtn.disabled = true;
  progressEl.value = 0;
});
