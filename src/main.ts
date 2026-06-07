// Phase 0 shell. Stays light: capability detection + UI wiring only. Both engines
// (ffmpeg.wasm and the WebCodecs pipeline) are imported dynamically on intent.

import { CORE_APPROX_MB, chooseCore, detectCapabilities } from './capabilities';
import { type CompressMetrics, formatBytes, heapMB, reductionPct } from './measure';
import { type CompressOptions, DEFAULT_OPTIONS, PRESETS } from './options';
import { probeWebCodecs } from './webcodecs';

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
const engineSel = byId<HTMLSelectElement>('engine');
const presetSel = byId<HTMLSelectElement>('preset');
const crfInput = byId<HTMLInputElement>('crf');
const heightSel = byId<HTMLSelectElement>('height');
const webcodecsEl = byId<HTMLDivElement>('webcodecs');

const caps = detectCapabilities();
const core = chooseCore(caps);
statusEl.textContent =
  `crossOriginIsolated: ${caps.crossOriginIsolated} · SharedArrayBuffer: ${caps.sharedArrayBuffer} · ` +
  `ffmpeg core: ${core === 'mt' ? 'multi-threaded' : 'single-threaded (fallback)'}`;

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

// Phase 0: probe the WebCodecs (hardware) path we're evaluating as the fast lane.
void probeWebCodecs().then((results) => {
  webcodecsEl.replaceChildren();
  const heading = document.createElement('strong');
  heading.textContent = 'WebCodecs probe:';
  const list = document.createElement('ul');
  for (const r of results) {
    const li = document.createElement('li');
    li.textContent = `${r.supported ? '✓' : '✗'} ${r.label}${r.note ? ` — ${r.note}` : ''}`;
    list.appendChild(li);
  }
  webcodecsEl.append(heading, list);
});

let selectedFile: File | null = null;
let running: { terminate: () => void } | null = null; // only ffmpeg.wasm is cancelable in this spike

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
  const engine: 'ffmpeg.wasm' | 'webcodecs' =
    engineSel.value === 'webcodecs' ? 'webcodecs' : 'ffmpeg.wasm';
  const opts: CompressOptions = {
    preset: presetSel.value,
    crf: Number(crfInput.value),
    height: Number(heightSel.value),
  };

  // Only ffmpeg.wasm pulls a large engine; disclose its size first.
  if (engine === 'ffmpeg.wasm') {
    const proceed = confirm(
      `This downloads the ~${CORE_APPROX_MB[core]} MB compression engine once (then cached) and runs ` +
        `entirely on your device — nothing is uploaded. Continue?`,
    );
    if (!proceed) return;
  }

  compressBtn.disabled = true;
  cancelBtn.disabled = engine !== 'ffmpeg.wasm';
  progressEl.value = 0;
  const onProgress = (r: number): void => {
    progressEl.value = Math.max(0, Math.min(1, r));
  };

  try {
    let output: Uint8Array<ArrayBuffer>;
    let loadMs: number;
    let encodeMs: number;
    const loadStart = performance.now();

    if (engine === 'ffmpeg.wasm') {
      log(`Loading ${core === 'mt' ? 'multi-threaded' : 'single-threaded'} ffmpeg engine…`);
      const { loadEngine, compress } = await import('./engine');
      const ffmpeg = await loadEngine(core, { onLog: log, onProgress });
      running = ffmpeg;
      loadMs = Math.round(performance.now() - loadStart);
      log(
        `Engine loaded in ${(loadMs / 1000).toFixed(1)}s (one-time; cached after). ` +
          `Settings: preset=${opts.preset} · crf=${opts.crf} · height=${opts.height}p`,
      );
      const encodeStart = performance.now();
      output = await compress(ffmpeg, file, opts);
      encodeMs = Math.round(performance.now() - encodeStart);
    } else {
      log('Loading WebCodecs pipeline…');
      const { compressWebCodecs } = await import('./webcodecs-pipeline');
      loadMs = Math.round(performance.now() - loadStart);
      log(
        `Pipeline loaded in ${(loadMs / 1000).toFixed(1)}s. Transcoding via WebCodecs (hardware path) · ` +
          `height=${opts.height}p · preset/CRF don't apply.`,
      );
      const encodeStart = performance.now();
      output = await compressWebCodecs(file, opts, { onLog: log, onProgress });
      encodeMs = Math.round(performance.now() - encodeStart);
    }

    const metrics: CompressMetrics = {
      engine,
      core: engine === 'ffmpeg.wasm' ? core : undefined,
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
      `Done [${engine}] · load ${(loadMs / 1000).toFixed(1)}s · encode ${(encodeMs / 1000).toFixed(1)}s · ` +
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
