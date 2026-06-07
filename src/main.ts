// Phase 0 shell. Stays light: capability detection + UI wiring only. The ffmpeg
// engine is imported dynamically on intent (see engine.ts).

import { detectCapabilities, chooseCore, CORE_APPROX_MB } from './capabilities';
import { reductionPct, heapMB, formatBytes, type CompressMetrics } from './measure';
import { DEFAULT_OPTIONS, PRESETS, type CompressOptions } from './options';

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
const presetSel = byId<HTMLSelectElement>('preset');
const crfInput = byId<HTMLInputElement>('crf');
const heightSel = byId<HTMLSelectElement>('height');

const caps = detectCapabilities();
const core = chooseCore(caps);
statusEl.textContent =
  `crossOriginIsolated: ${caps.crossOriginIsolated} · SharedArrayBuffer: ${caps.sharedArrayBuffer} · ` +
  `engine: ${core === 'mt' ? 'multi-threaded' : 'single-threaded (fallback)'}`;

// Seed the controls from the defaults (single source of truth in options.ts).
for (const p of PRESETS) {
  const opt = document.createElement('option');
  opt.value = p;
  opt.textContent = p;
  presetSel.appendChild(opt);
}
presetSel.value = DEFAULT_OPTIONS.preset;
crfInput.value = String(DEFAULT_OPTIONS.crf);
heightSel.value = String(DEFAULT_OPTIONS.height);

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

  try {
    log(`Loading ${core === 'mt' ? 'multi-threaded' : 'single-threaded'} engine…`);
    const loadStart = performance.now();
    const { loadEngine, compress } = await import('./engine');
    const ffmpeg = await loadEngine(core, {
      onLog: (m) => log(m),
      onProgress: (r) => { progressEl.value = Math.max(0, Math.min(1, r)); },
    });
    const loadMs = Math.round(performance.now() - loadStart);
    running = ffmpeg;
    log(`Engine loaded in ${(loadMs / 1000).toFixed(1)}s (one-time; cached after). Compressing…`);

    const opts: CompressOptions = {
      preset: presetSel.value,
      crf: Number(crfInput.value),
      height: Number(heightSel.value),
    };
    log(`Settings: preset=${opts.preset} · crf=${opts.crf} · height=${opts.height}p`);
    const encodeStart = performance.now();
    const output = await compress(ffmpeg, file, opts);
    const encodeMs = Math.round(performance.now() - encodeStart);
    const metrics: CompressMetrics = {
      core,
      preset: opts.preset,
      crf: opts.crf,
      height: opts.height,
      inputBytes: file.size,
      outputBytes: output.byteLength,
      reductionPct: reductionPct(file.size, output.byteLength),
      loadMs,
      encodeMs,
      peakHeapMB: heapMB(),
    };

    const url = URL.createObjectURL(new Blob([output], { type: 'video/mp4' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `compressed-${file.name.replace(/\.[^.]+$/, '')}.mp4`;
    link.textContent = `Download result (${formatBytes(metrics.outputBytes)})`;
    resultEl.replaceChildren(link);

    log(
      `Done · load ${(loadMs / 1000).toFixed(1)}s · encode ${(encodeMs / 1000).toFixed(1)}s · ` +
        `${formatBytes(metrics.inputBytes)} → ${formatBytes(metrics.outputBytes)} ` +
        `(${metrics.reductionPct}% smaller)` +
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
