// Cove Convert — convert a data file between CSV, JSON, and Parquet on-device with DuckDB-WASM
// (ADR-0011), in a Web Worker, with zero egress for local files. The single-threaded `eh` engine
// (~35 MB) and the json/parquet extensions it needs are vendored same-origin (scripts/copy-duckdb.mjs
// + scripts/fetch-duckdb-extensions.mjs) and loaded lazily on first convert — DuckDB's default is to
// autoload extensions from a CDN, which would break zero egress, so we point it at a same-origin repo.
// Conversion SQL + format helpers are pure and unit-tested in conversion.ts.
import { AsyncDuckDB, VoidLogger } from '@duckdb/duckdb-wasm';
import {
  conversionSql,
  detectFormat,
  FORMATS,
  type Format,
  mimeFor,
  outputName,
} from '../conversion';
import { formatDiagnostics } from '../diagnostics';
import type { Command } from '../palette';
import { canSaveInPlace, saveOutput } from '../save';
import type { ToolContext } from '../shell/tool';

const ENGINE_MB = 35;
// The single-threaded `eh` build, vendored same-origin (scripts/copy-duckdb.mjs). We force `eh`
// rather than DuckDB's `selectBundle`: the multi-threaded `coi` build can't link the json/parquet
// extensions the converter needs (shared-memory mismatch), so `eh` is the working path (ADR-0011).
const ENGINE = {
  mainModule: '/duckdb/duckdb-eh.wasm',
  mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
};
// json/parquet live in DuckDB extensions, not the core wasm; DuckDB would autoload them from a CDN
// (extensions.duckdb.org) — egress. They're vendored same-origin (scripts/fetch-duckdb-extensions.mjs)
// and we point DuckDB here, so it fetches `<repo>/<version>/wasm_eh/<name>.duckdb_extension.wasm`
// same-origin (validated in spike/selfhost.mjs). Zero egress.
const EXTENSION_REPO = `${location.origin}/duckdb-ext`;
const LABEL: Record<Format, string> = { csv: 'CSV', json: 'JSON', parquet: 'Parquet' };

const TEMPLATE = `
  <button id="dropzone" type="button" class="dropzone">
    <span class="dz-icon" aria-hidden="true">⬇</span>
    <span>Drop a data file here<br /><span class="dz-sub">CSV, JSON, or Parquet — or click to choose</span></span>
  </button>
  <input id="file" type="file" accept=".csv,.tsv,.json,.ndjson,.parquet,.pq" aria-label="Data file" hidden />

  <section id="panel" aria-label="Conversion" hidden>
    <p id="fileinfo" class="fileinfo"></p>
    <div class="settings">
      <label>Convert to <select id="target"></select></label>
    </div>
    <div class="actions">
      <button id="convert" class="primary" type="button">Convert &amp; save</button>
    </div>
    <progress id="progress" aria-label="Converting" hidden></progress>
    <p id="status-msg" class="status-msg" role="status" aria-live="polite"></p>
  </section>

  <details id="details">
    <summary>Details</summary>
    <p id="status"></p>
    <pre id="log"></pre>
    <button id="copy-diag" type="button">Copy diagnostics</button>
  </details>
`;

export function mount(ctx: ToolContext): () => void {
  const { host, caps } = ctx;
  host.innerHTML = TEMPLATE;

  const byId = <T extends HTMLElement>(id: string): T => {
    const el = host.querySelector<T>(`#${id}`);
    if (!el) throw new Error(`missing #${id}`);
    return el;
  };

  const dropzone = byId<HTMLButtonElement>('dropzone');
  const fileInput = byId<HTMLInputElement>('file');
  const panel = byId<HTMLElement>('panel');
  const fileinfo = byId<HTMLParagraphElement>('fileinfo');
  const targetSel = byId<HTMLSelectElement>('target');
  const convertBtn = byId<HTMLButtonElement>('convert');
  const progressEl = byId<HTMLProgressElement>('progress');
  const statusMsg = byId<HTMLParagraphElement>('status-msg');
  const statusEl = byId<HTMLParagraphElement>('status');
  const logEl = byId<HTMLPreElement>('log');
  const detailsEl = byId<HTMLDetailsElement>('details');
  const copyDiagBtn = byId<HTMLButtonElement>('copy-diag');

  for (const f of FORMATS) {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = LABEL[f];
    targetSel.appendChild(opt);
  }

  statusEl.textContent = `engine: DuckDB-WASM (~${ENGINE_MB} MB, on first convert) · save-in-place: ${canSaveInPlace()}`;
  ctx.setCapabilityNotice({
    level: 'info',
    text: `Conversion runs entirely on your device — nothing is uploaded. The ~${ENGINE_MB} MB engine (plus a small format extension) downloads on the first conversion, then is cached.`,
  });

  let selectedFile: File | null = null;
  let sourceFormat: Format | null = null;
  let db: AsyncDuckDB | null = null;
  let busy = false;

  const log = (line: string): void => {
    logEl.textContent += `${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  // Lazy-instantiate DuckDB-WASM from the vendored same-origin `eh` engine; memoized after first use.
  const getDb = async (): Promise<AsyncDuckDB> => {
    if (db) return db;
    const worker = new Worker(ENGINE.mainWorker);
    const instance = new AsyncDuckDB(new VoidLogger(), worker);
    await instance.instantiate(ENGINE.mainModule);
    db = instance;
    return db;
  };

  const selectFile = (file: File): void => {
    const fmt = detectFormat(file.name);
    if (!fmt) {
      statusMsg.textContent = 'Unsupported file — choose a CSV, JSON, or Parquet file.';
      return;
    }
    selectedFile = file;
    sourceFormat = fmt;
    panel.hidden = false;
    statusMsg.textContent = '';
    fileinfo.textContent = `${file.name} · ${LABEL[fmt]}`;
    // Default the target to a different format than the source.
    targetSel.value = FORMATS.find((f) => f !== fmt) ?? 'parquet';
  };

  const convert = async (): Promise<void> => {
    if (!selectedFile || !sourceFormat || busy) return;
    const target = targetSel.value as Format;
    if (target === sourceFormat) {
      statusMsg.textContent = `Already ${LABEL[target]} — pick a different target format.`;
      return;
    }
    if (
      !db &&
      !confirm(
        `This downloads the ~${ENGINE_MB} MB DuckDB engine (plus a small format extension) once ` +
          '(then cached) and runs entirely on your device — nothing is uploaded. Continue?',
      )
    ) {
      return;
    }

    busy = true;
    convertBtn.disabled = true;
    progressEl.hidden = false;
    statusMsg.textContent = db ? 'Converting…' : 'Loading the engine, then converting…';
    const t0 = performance.now();
    const inName = `input.${sourceFormat}`;
    const outName = `output.${target}`;
    let conn: Awaited<ReturnType<AsyncDuckDB['connect']>> | null = null;
    try {
      const database = await getDb();
      conn = await database.connect();
      // Load the json/parquet extensions from our same-origin repo, never the CDN (zero egress).
      await conn.query(`SET custom_extension_repository='${EXTENSION_REPO}'`);
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      await database.registerFileBuffer(inName, bytes);
      log(`Converting ${LABEL[sourceFormat]} → ${LABEL[target]}…`);
      await conn.query(conversionSql(sourceFormat, target, inName, outName));
      const out = await database.copyFileToBuffer(outName);
      await database.dropFiles();

      const name = outputName(selectedFile.name, target);
      const res = await saveOutput(out.slice(), name, {
        mimeType: mimeFor(target),
        description: `${LABEL[target]} file`,
        extensions: [`.${target}`],
      });
      const secs = ((performance.now() - t0) / 1000).toFixed(1);
      statusMsg.textContent =
        res === 'saved'
          ? `Saved ${name} (${secs}s).`
          : res === 'downloaded'
            ? `Downloaded ${name} (${secs}s).`
            : 'Save cancelled.';
      log(`Done · ${selectedFile.name} → ${name} · ${secs}s · ${res}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      statusMsg.textContent = `Conversion failed: ${msg}`;
      log(`Error: ${msg}`);
    } finally {
      await conn?.close();
      busy = false;
      convertBtn.disabled = false;
      progressEl.hidden = true;
    }
  };

  // File picker + drag/drop, with window guards so a stray drop can't navigate the page away.
  const onWindowDragOver = (e: DragEvent): void => e.preventDefault();
  const onWindowDrop = (e: DragEvent): void => e.preventDefault();
  dropzone.addEventListener('click', () => {
    fileInput.value = '';
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
    if (file) selectFile(file);
  });
  window.addEventListener('dragover', onWindowDragOver);
  window.addEventListener('drop', onWindowDrop);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) selectFile(file);
  });
  convertBtn.addEventListener('click', () => void convert());

  // Telemetry-free diagnostics (FR-P7): a copyable, on-device report; nothing is transmitted.
  let copyResetTimer: number | undefined;
  const copyDiagnostics = async (): Promise<void> => {
    const report = formatDiagnostics({
      userAgent: navigator.userAgent,
      caps,
      details: {
        tool: 'convert',
        source: sourceFormat ?? '(none)',
        target: targetSel.value,
        'engine loaded': String(db !== null),
        'save-in-place': String(canSaveInPlace()),
      },
      log: logEl.textContent ?? '',
    });
    try {
      await navigator.clipboard.writeText(report);
      copyDiagBtn.textContent = 'Copied ✓';
      clearTimeout(copyResetTimer);
      copyResetTimer = window.setTimeout(() => {
        copyDiagBtn.textContent = 'Copy diagnostics';
      }, 1500);
    } catch {
      log(report);
    }
  };
  copyDiagBtn.addEventListener('click', () => void copyDiagnostics());

  const commands: Command[] = [
    {
      id: 'choose',
      title: 'Open data file…',
      aliases: ['file', 'pick'],
      run: () => dropzone.click(),
    },
    {
      id: 'convert',
      title: 'Convert & save',
      aliases: ['run', 'export', 'save'],
      run: () => convertBtn.click(),
      enabled: () => !panel.hidden && !convertBtn.disabled,
    },
    {
      id: 'details',
      title: 'Toggle details',
      run: () => {
        detailsEl.open = !detailsEl.open;
      },
    },
    {
      id: 'copy-diag',
      title: 'Copy diagnostics',
      aliases: ['report', 'bug', 'log'],
      run: () => copyDiagBtn.click(),
    },
  ];
  ctx.registerCommands(commands);

  return () => {
    void db?.terminate();
    db = null;
    clearTimeout(copyResetTimer);
    ctx.setCapabilityNotice(null);
    window.removeEventListener('dragover', onWindowDragOver);
    window.removeEventListener('drop', onWindowDrop);
  };
}
