// Shell: drop-zone UI + capability detection. Compression is delegated to the engine
// orchestrator (compressor.ts), which auto-selects WebCodecs or ffmpeg.wasm. Diagnostics
// (capabilities, engine override, log) live behind the Details disclosure.

import { CORE_APPROX_MB, chooseCore, detectCapabilities } from './capabilities';
import { compress, type EngineChoice, webCodecsSupported } from './compressor';
import { capabilityNote, friendlyError } from './errors';
import { type CompressMetrics, formatBytes, heapMB, reductionPct } from './measure';
import {
  type CompressOptions,
  DEFAULT_OPTIONS,
  QUALITIES,
  type Quality,
  targetBitrate,
} from './options';
import { type Command, createPalette } from './palette';
import { canSaveInPlace, saveOutput } from './save';
import { probeWebCodecs } from './webcodecs';

const byId = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const dropzone = byId<HTMLButtonElement>('dropzone');
const fileInput = byId<HTMLInputElement>('file');
const panel = byId<HTMLElement>('panel');
const fileinfo = byId<HTMLParagraphElement>('fileinfo');
const qualitySel = byId<HTMLSelectElement>('quality');
const targetInput = byId<HTMLInputElement>('target');
const heightSel = byId<HTMLSelectElement>('height');
const compressBtn = byId<HTMLButtonElement>('compress');
const cancelBtn = byId<HTMLButtonElement>('cancel');
const progressEl = byId<HTMLProgressElement>('progress');
const statusMsg = byId<HTMLParagraphElement>('status-msg');
const resultEl = byId<HTMLDivElement>('result');
// Diagnostics (inside the Details disclosure).
const statusEl = byId<HTMLParagraphElement>('status');
const engineSel = byId<HTMLSelectElement>('engine');
const webcodecsEl = byId<HTMLDivElement>('webcodecs');
const logEl = byId<HTMLPreElement>('log');
const detailsEl = byId<HTMLDetailsElement>('details');
const cmdkBtn = byId<HTMLButtonElement>('cmdk');
const capabilityEl = byId<HTMLParagraphElement>('capability');

const caps = detectCapabilities();
statusEl.textContent =
  `crossOriginIsolated: ${caps.crossOriginIsolated} · SharedArrayBuffer: ${caps.sharedArrayBuffer} · ` +
  `ffmpeg fallback core: ${chooseCore(caps) === 'mt' ? 'multi-threaded' : 'single-threaded'}`;

// User-facing note on which compression path this browser will use (FR-P7).
void webCodecsSupported().then((ok) => {
  capabilityEl.textContent = capabilityNote(ok, caps.crossOriginIsolated);
});

// Seed the controls from the defaults (single source of truth in options.ts).
const QUALITY_LABELS: Record<Quality, string> = {
  high: 'High',
  balanced: 'Balanced',
  small: 'Small',
};
for (const q of QUALITIES) {
  const opt = document.createElement('option');
  opt.value = q;
  opt.textContent = QUALITY_LABELS[q];
  qualitySel.appendChild(opt);
}
qualitySel.value = DEFAULT_OPTIONS.quality;
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
let durationSec = 0;

function log(line: string): void {
  logEl.textContent += `${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function formatDuration(sec: number): string {
  if (!sec || !Number.isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Read duration + dimensions without decoding the whole clip.
function probeMeta(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    const done = (duration: number, width: number, height: number): void => {
      URL.revokeObjectURL(url);
      resolve({ duration: Number.isFinite(duration) ? duration : 0, width, height });
    };
    video.onloadedmetadata = () => done(video.duration, video.videoWidth, video.videoHeight);
    video.onerror = () => done(0, 0, 0);
    video.src = url;
  });
}

async function selectFile(file: File): Promise<void> {
  selectedFile = file;
  durationSec = 0;
  resultEl.replaceChildren();
  statusMsg.textContent = '';
  progressEl.hidden = true;
  panel.hidden = false;
  compressBtn.disabled = false;
  fileinfo.textContent = `${file.name} · ${formatBytes(file.size)}`;

  const meta = await probeMeta(file);
  durationSec = meta.duration;
  const dims = meta.width && meta.height ? `${meta.width}×${meta.height}` : null;
  fileinfo.textContent = [file.name, dims, formatDuration(meta.duration), formatBytes(file.size)]
    .filter(Boolean)
    .join(' · ');
}

dropzone.addEventListener('click', () => {
  fileInput.value = ''; // allow re-choosing the same file
  fileInput.click();
});
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (file) void selectFile(file);
});
// A drop outside the zone must not navigate the page away.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) void selectFile(file);
});

compressBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  const file = selectedFile;
  const choice = engineSel.value as EngineChoice;
  const targetMB = Number(targetInput.value);
  if (targetMB > 0 && durationSec <= 0) durationSec = (await probeMeta(file)).duration;
  const videoBitrate = targetBitrate(targetMB, durationSec);
  if (targetMB > 0 && videoBitrate <= 0) {
    log("Couldn't read the clip's duration; using the quality preset instead.");
  }
  const options: CompressOptions = {
    quality: qualitySel.value as Quality,
    height: Number(heightSel.value),
    ...(videoBitrate > 0 ? { videoBitrate } : {}),
  };

  controller = new AbortController();
  compressBtn.disabled = true;
  cancelBtn.hidden = false;
  progressEl.hidden = false;
  progressEl.value = 0;
  statusMsg.textContent = 'Compressing…';
  const t0 = performance.now();
  const modeLabel = options.videoBitrate
    ? `target ${targetMB} MB (~${Math.round(options.videoBitrate / 1000)} kbps)`
    : `quality=${options.quality}`;
  log(`Compressing (engine: ${choice}) · ${modeLabel} · height=${options.height}p…`);

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
      quality: options.quality,
      videoBitrate: options.videoBitrate,
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
    saveBtn.className = 'primary';
    saveBtn.textContent = `${canSaveInPlace() ? 'Save' : 'Download'} result (${formatBytes(metrics.outputBytes)})`;
    saveBtn.addEventListener('click', async () => {
      try {
        const result = await saveOutput(data, suggestedName);
        if (result === 'saved') statusMsg.textContent = `Saved ${suggestedName}.`;
        else if (result === 'downloaded') statusMsg.textContent = `Downloaded ${suggestedName}.`;
      } catch (e) {
        statusMsg.textContent = `Save failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    });
    resultEl.replaceChildren(saveBtn);
    saveBtn.focus();

    statusMsg.textContent =
      `Done · ${formatBytes(metrics.inputBytes)} → ${formatBytes(metrics.outputBytes)} ` +
      `(${metrics.reductionPct}% smaller) in ${(elapsedMs / 1000).toFixed(1)}s`;
    log(
      `Done [${engine}] · ${(elapsedMs / 1000).toFixed(1)}s · ${formatBytes(metrics.inputBytes)} → ` +
        `${formatBytes(metrics.outputBytes)} (${metrics.reductionPct}% smaller)` +
        (metrics.peakHeapMB ? ` · heap ~${metrics.peakHeapMB} MB` : ''),
    );
    console.table(metrics);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    if (controller.signal.aborted) {
      statusMsg.textContent = 'Cancelled.';
      log('Cancelled.');
    } else {
      statusMsg.textContent = friendlyError(raw);
      log(`Error: ${raw}`);
    }
  } finally {
    progressEl.hidden = true;
    progressEl.value = 0;
    compressBtn.disabled = false;
    cancelBtn.hidden = true;
    controller = null;
  }
});

cancelBtn.addEventListener('click', () => {
  controller?.abort();
  cancelBtn.hidden = true;
  statusMsg.textContent = 'Cancelling…';
});

// Command palette (⌘K / Ctrl-K): keyboard access to every primary action (FR-P10). Each
// command drives the same control as the UI, so the two never drift.
const commands: Command[] = [
  {
    id: 'choose',
    title: 'Choose video…',
    aliases: ['open', 'file', 'pick'],
    run: () => dropzone.click(),
  },
  {
    id: 'compress',
    title: 'Compress',
    aliases: ['start', 'run'],
    run: () => compressBtn.click(),
    enabled: () => !panel.hidden && !compressBtn.disabled,
  },
  { id: 'cancel', title: 'Cancel', run: () => cancelBtn.click(), enabled: () => !cancelBtn.hidden },
  {
    id: 'save',
    title: 'Save result',
    aliases: ['download', 'export'],
    run: () => resultEl.querySelector('button')?.click(),
    enabled: () => resultEl.querySelector('button') !== null,
  },
  {
    id: 'q-high',
    title: 'Quality: High',
    run: () => {
      qualitySel.value = 'high';
    },
  },
  {
    id: 'q-balanced',
    title: 'Quality: Balanced',
    run: () => {
      qualitySel.value = 'balanced';
    },
  },
  {
    id: 'q-small',
    title: 'Quality: Small',
    run: () => {
      qualitySel.value = 'small';
    },
  },
  {
    id: 'r-480',
    title: 'Resolution: 480p',
    run: () => {
      heightSel.value = '480';
    },
  },
  {
    id: 'r-720',
    title: 'Resolution: 720p',
    run: () => {
      heightSel.value = '720';
    },
  },
  {
    id: 'r-1080',
    title: 'Resolution: 1080p',
    run: () => {
      heightSel.value = '1080';
    },
  },
  {
    id: 'details',
    title: 'Toggle details',
    run: () => {
      detailsEl.open = !detailsEl.open;
    },
  },
];
const palette = createPalette(commands);
cmdkBtn.addEventListener('click', () => palette.open());
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    palette.open();
  }
});
