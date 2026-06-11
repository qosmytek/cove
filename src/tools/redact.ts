// Cove Redact — the PDF redactor, packaged as a Tool. It renders pages with pdf.js, lets the
// user black out regions (drag) or whole pages (keyboard), then rebuilds a fresh PDF where each
// affected page is replaced by a flattened raster (rasterize-and-rebuild, ADR-0010) so redacted
// content carries no recoverable text/vector/image — validated by the Phase 3 spike. The rebuild
// itself lives in redaction.ts (DOM-free, unit-tested); this module owns rendering + marking.
import { GlobalWorkerOptions, getDocument, type PDFDocumentLoadingTask, version } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { formatDiagnostics } from '../diagnostics';
import type { Command } from '../palette';
import { type Box, nudgeBox, rebuildRedacted } from '../redaction';
import { canSaveInPlace, saveOutput } from '../save';
import type { ToolContext } from '../shell/tool';

GlobalWorkerOptions.workerSrc = workerUrl;

const RENDER_SCALE = 2; // px per point — the display + export resolution
const MIN_MARK = 3; // px; ignore stray taps

const TEMPLATE = `
  <button id="dropzone" type="button" class="dropzone">
    <span class="dz-icon" aria-hidden="true">⬇</span>
    <span>Drop a PDF here<br /><span class="dz-sub">or click to choose</span></span>
  </button>
  <input id="file" type="file" accept="application/pdf,.pdf" aria-label="PDF file" hidden />

  <section id="panel" aria-label="Redaction" hidden>
    <p id="fileinfo" class="fileinfo"></p>
    <p class="dz-sub">Drag to black out a region — or press “Add box”, then arrow keys to move, Shift+arrows to resize, Delete to remove. Click a box to remove it; or tick “Redact entire page”.</p>
    <div class="actions">
      <button id="redact" class="primary" type="button">Redact &amp; save</button>
      <button id="clear" type="button">Clear marks</button>
    </div>
    <progress id="progress" max="1" value="0" aria-label="Loading pages" hidden></progress>
    <p id="status-msg" class="status-msg" role="status" aria-live="polite"></p>
    <div id="pages" class="pages"></div>
  </section>

  <details id="details">
    <summary>Details</summary>
    <p id="status"></p>
    <pre id="log"></pre>
    <button id="copy-diag" type="button">Copy diagnostics</button>
  </details>
`;

interface PageState {
  canvas: HTMLCanvasElement;
  marks: Box[];
  wholePage: boolean;
  marksEl: HTMLDivElement;
}

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
  const redactBtn = byId<HTMLButtonElement>('redact');
  const clearBtn = byId<HTMLButtonElement>('clear');
  const progressEl = byId<HTMLProgressElement>('progress');
  const statusMsg = byId<HTMLParagraphElement>('status-msg');
  const pagesEl = byId<HTMLDivElement>('pages');
  const statusEl = byId<HTMLParagraphElement>('status');
  const logEl = byId<HTMLPreElement>('log');
  const detailsEl = byId<HTMLDetailsElement>('details');
  const copyDiagBtn = byId<HTMLButtonElement>('copy-diag');

  statusEl.textContent = `engine: pdf.js ${version} + pdf-lib · save-in-place: ${canSaveInPlace()}`;
  ctx.setCapabilityNotice({
    level: 'info',
    text: canSaveInPlace()
      ? 'Redaction runs entirely on your device — nothing is uploaded.'
      : 'Redaction runs entirely on your device — nothing is uploaded; the result will download.',
  });

  let originalBytes: Uint8Array | null = null;
  let baseName = 'document';
  let pages: PageState[] = [];
  let loadingTask: PDFDocumentLoadingTask | null = null;
  let busy = false;

  const log = (line: string): void => {
    logEl.textContent += `${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  const resetPages = (): void => {
    void loadingTask?.destroy();
    loadingTask = null;
    pages = [];
    pagesEl.replaceChildren();
  };

  // Build the DOM + marking interaction for one rendered page; returns its state.
  const addPageUI = (index: number, canvas: HTMLCanvasElement): PageState => {
    const fig = document.createElement('figure');
    fig.className = 'page';
    const wrap = document.createElement('div');
    wrap.className = 'page-wrap';
    const marksEl = document.createElement('div');
    marksEl.className = 'page-marks';
    marksEl.setAttribute('aria-label', `Page ${index + 1} — drag to mark a redaction`);
    wrap.append(canvas, marksEl);

    // Keyboard entry point (RD-1): a real button adds a box you then nudge with the arrow keys.
    const tools = document.createElement('div');
    tools.className = 'page-tools';
    const addBoxBtn = document.createElement('button');
    addBoxBtn.type = 'button';
    addBoxBtn.className = 'add-box';
    addBoxBtn.textContent = `Add box to page ${index + 1}`;
    const wholeLabel = document.createElement('label');
    const whole = document.createElement('input');
    whole.type = 'checkbox';
    wholeLabel.append(whole, document.createTextNode(` Redact entire page ${index + 1}`));
    tools.append(addBoxBtn, wholeLabel);

    fig.append(wrap, tools);
    pagesEl.append(fig);

    const state: PageState = { canvas, marks: [], wholePage: false, marksEl };

    whole.addEventListener('change', () => {
      state.wholePage = whole.checked;
      marksEl.classList.toggle('whole', whole.checked);
      addBoxBtn.disabled = whole.checked; // a whole-page redaction already covers every region
    });

    const place = (el: HTMLElement, r: Box): void => {
      el.style.left = `${(r.x / canvas.width) * 100}%`;
      el.style.top = `${(r.y / canvas.height) * 100}%`;
      el.style.width = `${(r.w / canvas.width) * 100}%`;
      el.style.height = `${(r.h / canvas.height) * 100}%`;
    };
    const removeMark = (r: Box, el: HTMLElement): void => {
      const i = state.marks.indexOf(r);
      if (i >= 0) state.marks.splice(i, 1);
      el.remove();
    };
    // A redaction box: focusable so it can be moved/resized/removed entirely by keyboard (RD-1),
    // and click-to-remove for the mouse. The geometry is pure (nudgeBox), unit-tested.
    const addMark = (r: Box): HTMLDivElement => {
      state.marks.push(r);
      const el = document.createElement('div');
      el.className = 'mark';
      el.tabIndex = 0;
      el.title = 'Click to remove';
      el.setAttribute('aria-roledescription', 'redaction box');
      el.setAttribute(
        'aria-label',
        `Redaction box on page ${index + 1}. Arrow keys move; Shift plus arrows resize; Delete removes.`,
      );
      place(el, r);
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); // don't start a new drag
        removeMark(r, el);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          removeMark(r, el);
          addBoxBtn.focus();
          return;
        }
        const step = Math.max(4, Math.round(canvas.width * 0.01));
        const next = nudgeBox(r, e.key, e.shiftKey, canvas, step);
        if (next !== r) {
          e.preventDefault();
          Object.assign(r, next);
          place(el, r);
        }
      });
      marksEl.appendChild(el);
      return el;
    };

    addBoxBtn.addEventListener('click', () => {
      const el = addMark({
        x: Math.round(canvas.width * 0.3),
        y: Math.round(canvas.height * 0.44),
        w: Math.round(canvas.width * 0.4),
        h: Math.round(canvas.height * 0.08),
      });
      el.focus();
      statusMsg.textContent =
        'Added a box — arrow keys move it, Shift+arrows resize, Delete removes.';
    });

    // Pointer-drag to draw a box. Coords are stored in canvas pixels and rendered as percentages
    // so the marks track the responsive canvas.
    let startX = 0;
    let startY = 0;
    let preview: HTMLDivElement | null = null;
    const toCanvas = (clientX: number, clientY: number): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      return [Math.max(0, Math.min(canvas.width, x)), Math.max(0, Math.min(canvas.height, y))];
    };
    const boxFrom = (x: number, y: number): Box => ({
      x: Math.min(startX, x),
      y: Math.min(startY, y),
      w: Math.abs(x - startX),
      h: Math.abs(y - startY),
    });

    marksEl.addEventListener('pointerdown', (e) => {
      if (state.wholePage) return;
      e.preventDefault();
      marksEl.setPointerCapture(e.pointerId);
      [startX, startY] = toCanvas(e.clientX, e.clientY);
      preview = document.createElement('div');
      preview.className = 'mark preview';
      marksEl.appendChild(preview);
    });
    marksEl.addEventListener('pointermove', (e) => {
      if (!preview) return;
      const [x, y] = toCanvas(e.clientX, e.clientY);
      place(preview, boxFrom(x, y));
    });
    marksEl.addEventListener('pointerup', (e) => {
      if (!preview) return;
      const [x, y] = toCanvas(e.clientX, e.clientY);
      const r = boxFrom(x, y);
      preview.remove();
      preview = null;
      if (r.w > MIN_MARK && r.h > MIN_MARK) addMark(r);
    });
    marksEl.addEventListener('pointercancel', () => {
      preview?.remove();
      preview = null;
    });

    return state;
  };

  const selectFile = async (file: File): Promise<void> => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      statusMsg.textContent = 'Please choose a PDF.';
      return;
    }
    resetPages();
    panel.hidden = false;
    progressEl.hidden = false;
    progressEl.value = 0;
    statusMsg.textContent = 'Loading…';
    baseName = file.name.replace(/\.pdf$/i, '') || 'document';
    originalBytes = new Uint8Array(await file.arrayBuffer());
    fileinfo.textContent = file.name;

    try {
      loadingTask = getDocument({
        data: originalBytes.slice(),
        // Vendored same-origin (scripts/copy-pdfjs-standard-fonts.mjs) so non-embedded base-14
        // fonts render faithfully with zero egress — fetched only when a PDF actually needs them.
        standardFontDataUrl: '/pdfjs/standard_fonts/',
      });
      const doc = await loadingTask.promise;
      fileinfo.textContent = `${file.name} · ${doc.numPages} page${doc.numPages === 1 ? '' : 's'}`;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport }).promise;
        pages.push(addPageUI(i - 1, canvas));
        progressEl.value = i / doc.numPages;
      }
      statusMsg.textContent = 'Drag across a page to mark a redaction.';
      log(`Loaded ${file.name} (${doc.numPages} pages).`);
    } catch (e) {
      statusMsg.textContent = `Couldn't open this PDF: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      progressEl.hidden = true;
    }
  };

  const affected = (): PageState[] => pages.filter((p) => p.wholePage || p.marks.length > 0);

  // Composite the marks onto a copy of the rendered page and return PNG bytes.
  const exportPage = (p: PageState): Promise<Uint8Array> => {
    const off = document.createElement('canvas');
    off.width = p.canvas.width;
    off.height = p.canvas.height;
    const c = off.getContext('2d');
    if (!c) throw new Error('Canvas 2D is unavailable');
    c.drawImage(p.canvas, 0, 0);
    c.fillStyle = '#000';
    if (p.wholePage) c.fillRect(0, 0, off.width, off.height);
    else for (const m of p.marks) c.fillRect(m.x, m.y, m.w, m.h);
    return new Promise((resolve, reject) => {
      off.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to rasterize page'));
          return;
        }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)), reject);
      }, 'image/png');
    });
  };

  const redactAndSave = async (): Promise<void> => {
    if (!originalBytes || busy) return;
    const todo = affected();
    if (todo.length === 0) {
      statusMsg.textContent = 'Mark a region (or tick a whole page) to redact first.';
      return;
    }
    busy = true;
    redactBtn.disabled = true;
    statusMsg.textContent = 'Redacting…';
    try {
      const rasterByPage = new Map<number, Uint8Array>();
      for (const p of todo) rasterByPage.set(pages.indexOf(p), await exportPage(p));
      const out = await rebuildRedacted(originalBytes, rasterByPage);
      const name = `redacted-${baseName}.pdf`;
      // .slice() guarantees an ArrayBuffer-backed (never SharedArrayBuffer) view for the Blob.
      const res = await saveOutput(out.slice(), name, {
        mimeType: 'application/pdf',
        description: 'PDF document',
        extensions: ['.pdf'],
      });
      statusMsg.textContent =
        res === 'saved'
          ? `Saved ${name}.`
          : res === 'downloaded'
            ? `Downloaded ${name}.`
            : 'Save cancelled.';
      log(`Redacted ${todo.length} page(s) → ${name} (${res}).`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      statusMsg.textContent = `Redaction failed: ${msg}`;
      log(`Error: ${msg}`);
    } finally {
      busy = false;
      redactBtn.disabled = false;
    }
  };

  const clearMarks = (): void => {
    for (const p of pages) {
      p.marks = [];
      p.wholePage = false;
      p.marksEl.classList.remove('whole');
      p.marksEl.replaceChildren();
    }
    for (const cb of host.querySelectorAll<HTMLInputElement>('.page-tools input'))
      cb.checked = false;
    statusMsg.textContent = 'Marks cleared.';
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
    if (file) void selectFile(file);
  });
  window.addEventListener('dragover', onWindowDragOver);
  window.addEventListener('drop', onWindowDrop);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) void selectFile(file);
  });
  redactBtn.addEventListener('click', () => void redactAndSave());
  clearBtn.addEventListener('click', clearMarks);

  // Telemetry-free diagnostics (FR-P7): a copyable, on-device report; nothing is transmitted.
  let copyResetTimer: number | undefined;
  const copyDiagnostics = async (): Promise<void> => {
    const report = formatDiagnostics({
      userAgent: navigator.userAgent,
      caps,
      details: {
        tool: 'redact',
        'pdf.js': version,
        pages: String(pages.length),
        'affected pages': String(affected().length),
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
      log(report); // clipboard unavailable — drop it in the log to copy by hand
    }
  };
  copyDiagBtn.addEventListener('click', () => void copyDiagnostics());

  const commands: Command[] = [
    { id: 'choose', title: 'Open PDF…', aliases: ['file', 'pick'], run: () => dropzone.click() },
    {
      id: 'redact',
      title: 'Redact & save',
      aliases: ['save', 'export', 'run'],
      run: () => redactBtn.click(),
      enabled: () => !panel.hidden && !redactBtn.disabled,
    },
    {
      id: 'clear',
      title: 'Clear marks',
      run: () => clearBtn.click(),
      enabled: () => !panel.hidden,
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
    resetPages();
    clearTimeout(copyResetTimer);
    ctx.setCapabilityNotice(null);
    window.removeEventListener('dragover', onWindowDragOver);
    window.removeEventListener('drop', onWindowDrop);
  };
}
