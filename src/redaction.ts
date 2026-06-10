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
