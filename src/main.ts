// Shell: capability detection + UI wiring. Compression is delegated to the engine
// orchestrator (compressor.ts), which auto-selects WebCodecs or ffmpeg.wasm.

import { CORE_APPROX_MB, chooseCore, detectCapabilities } from './capabilities';
import { compress, type EngineChoice } from './compressor';
import { type CompressMetrics, formatBytes, heapMB, reductionPct } from './measure';
import { type CompressOptions, DEFAULT_OPTIONS, PRESETS } from './options';
import { canSaveInPlace, saveOutput } from './save';
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
statusEl.textContent =
  `crossOriginIsolated: ${caps.crossOriginIsolated} · SharedArrayBuffer: ${caps.sharedArrayBuffer} · ` +
  `ffmpeg fallback core: ${chooseCore(caps) === 'mt' ? 'multi-threaded' : 'single-threaded'}`;

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
let controller: AbortController | null = null;

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
  const choice = engineSel.value as EngineChoice;
  const options: CompressOptions = {
    preset: presetSel.value,
    crf: Number(crfInput.value),
    height: Number(heightSel.value),
  };

  controller = new AbortController();
  compressBtn.disabled = true;
  cancelBtn.disabled = false;
  progressEl.value = 0;
  const t0 = performance.now();
  log(
    `Compressing (engine: ${choice}) · preset=${options.preset} · crf=${options.crf} · ` +
      `height=${options.height}p…`,
  );

  try {
    const { data, engine } = await compress(
      file,
      options,
      {
        onLog: log,
        onProgress: (r) => {
          progressEl.value = Math.max(0, Math.min(1, r));
        },
        signal: controller.signal,
        confirmFfmpegDownload: () =>
          confirm(
            `This downloads the ~${CORE_APPROX_MB[chooseCore()]} MB ffmpeg engine once (then cached) ` +
              'and runs entirely on your device — nothing is uploaded. Continue?',
          ),
      },
      choice,
    );

    const elapsedMs = Math.round(performance.now() - t0);
    const metrics: CompressMetrics = {
      engine,
      preset: options.preset,
      crf: options.crf,
      height: options.height,
      inputBytes: file.size,
      outputBytes: data.byteLength,
      reductionPct: reductionPct(file.size, data.byteLength),
      elapsedMs,
      peakHeapMB: heapMB(),
    };

    const suggestedName = `compressed-${file.name.replace(/\.[^.]+$/, '')}.mp4`;
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = `${canSaveInPlace() ? 'Save' : 'Download'} result (${formatBytes(metrics.outputBytes)})`;
    saveBtn.addEventListener('click', async () => {
      try {
        const result = await saveOutput(data, suggestedName);
        if (result === 'saved') log(`Saved ${suggestedName}.`);
        else if (result === 'downloaded') log(`Downloaded ${suggestedName}.`);
      } catch (e) {
        log(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
    resultEl.replaceChildren(saveBtn);

    log(
      `Done [${engine}] · ${(elapsedMs / 1000).toFixed(1)}s · ${formatBytes(metrics.inputBytes)} → ` +
        `${formatBytes(metrics.outputBytes)} (${metrics.reductionPct}% smaller)` +
        (metrics.peakHeapMB ? ` · heap ~${metrics.peakHeapMB} MB` : ''),
    );
    console.table(metrics);
  } catch (err) {
    if (controller.signal.aborted) log('Cancelled.');
    else log(`Error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    progressEl.value = 0;
    compressBtn.disabled = false;
    cancelBtn.disabled = true;
    controller = null;
  }
});

cancelBtn.addEventListener('click', () => {
  controller?.abort();
  cancelBtn.disabled = true;
  log('Cancelling…');
});
