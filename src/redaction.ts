// Redaction core: rasterize-and-rebuild (ADR-0010). Pure pdf-lib, no DOM — the browser tool
// (tools/redact.ts) renders + marks pages and hands the flattened page rasters here. Kept
// DOM-free so the security property can be asserted in a Node test (see tests/redact.test.ts).
import { PDFDocument } from 'pdf-lib';

/**
 * Rebuild `srcBytes` into a fresh PDF. Every page index in `rasterByPage` is replaced by its
 * flattened raster (a redacted page becomes an image, so no text/vector/image objects survive
 * — true removal by construction); all other pages are copied unchanged. Building a fresh
 * document also drops the source's metadata, scripts, attachments, and revision history.
 */
export async function rebuildRedacted(
  srcBytes: Uint8Array,
  rasterByPage: Map<number, Uint8Array>,
): Promise<Uint8Array> {
  const src = await PDFDocument.load(srcBytes);
  const out = await PDFDocument.create();

  const total = src.getPageCount();
  for (let i = 0; i < total; i++) {
    const raster = rasterByPage.get(i);
    if (raster) {
      const { width, height } = src.getPage(i).getSize();
      const image = await out.embedPng(raster);
      out.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
    } else {
      const [copied] = await out.copyPages(src, [i]);
      out.addPage(copied);
    }
  }

  // A fresh document inherits none of the source's metadata; stamp only a neutral producer.
  out.setProducer('Cove Redact');
  out.setCreator('Cove Redact');
  return out.save();
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * Move or resize `box` by one keyboard step, clamped within `bounds` and to a minimum size of
 * `step`. Plain arrows move; Shift+arrows resize (Right/Down grow, Left/Up shrink). Returns a new
 * box, or the original reference for keys it does not handle. Pure — unit-tested; the redactor's
 * keyboard handler (RD-1) wires it to the DOM.
 */
export function nudgeBox(
  box: Box,
  key: string,
  shift: boolean,
  bounds: { width: number; height: number },
  step: number,
): Box {
  const { x, y, w, h } = box;
  if (shift) {
    if (key === 'ArrowRight') return { x, y, w: clamp(w + step, step, bounds.width - x), h };
    if (key === 'ArrowLeft') return { x, y, w: clamp(w - step, step, bounds.width - x), h };
    if (key === 'ArrowDown') return { x, y, w, h: clamp(h + step, step, bounds.height - y) };
    if (key === 'ArrowUp') return { x, y, w, h: clamp(h - step, step, bounds.height - y) };
    return box;
  }
  if (key === 'ArrowRight') return { x: clamp(x + step, 0, bounds.width - w), y, w, h };
  if (key === 'ArrowLeft') return { x: clamp(x - step, 0, bounds.width - w), y, w, h };
  if (key === 'ArrowDown') return { x, y: clamp(y + step, 0, bounds.height - h), w, h };
  if (key === 'ArrowUp') return { x, y: clamp(y - step, 0, bounds.height - h), w, h };
  return box;
}
