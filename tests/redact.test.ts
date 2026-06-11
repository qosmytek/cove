import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { nudgeBox, rebuildRedacted } from '../src/redaction';

// The redactor's core guarantee (RD-2 / RD-6 / risk R10): a redacted page is rebuilt as a
// flattened raster, so its content is unrecoverable, while untouched pages keep their text and
// the source's metadata is dropped. The Phase 3 spike proved the full browser pipeline; this
// pins the security-critical rebuild as a permanent regression test (no canvas needed — a tiny
// PNG stands in for the rasterized page).

const SECRET = 'SECRET-12345';
const KEEP = 'KEEP-ME-INTACT';

// A 2x2 black PNG (generated via @napi-rs/canvas), standing in for a rasterized page image.
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAABHNCSVQICAgIfAhkiAAAAAFzUkdCAK7OHOkAAAAUSURBVAiZY2RgYPjPwMDAwMQABQAOKAEDtjjK0wAAAABJRU5ErkJggg==',
  ),
  (ch) => ch.charCodeAt(0),
);

async function extractText(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({ data: bytes.slice(), useSystemFonts: true });
  const doc = await task.promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
  }
  await task.destroy();
  return out;
}

async function makeInput(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setAuthor('Jane Doe');
  doc.setTitle('Confidential');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([612, 792]).drawText(`SSN: ${SECRET}`, { x: 72, y: 600, size: 14, font });
  doc.addPage([612, 792]).drawText(`Keep: ${KEEP}`, { x: 72, y: 700, size: 14, font });
  return doc.save();
}

describe('rebuildRedacted (RD-2 / RD-6)', () => {
  it('destroys redacted-page content while untouched pages keep their text', async () => {
    const input = await makeInput();
    const inText = await extractText(input);
    expect(inText[0]).toContain(SECRET); // sanity: the secret really is there to begin with
    expect(inText[1]).toContain(KEEP);

    const out = await rebuildRedacted(input, new Map([[0, PNG]]));
    const outText = await extractText(out);
    expect(outText.join('\n')).not.toContain(SECRET);
    expect(outText[0].trim()).toBe(''); // redacted page is now an image — no text layer
    expect(outText[1]).toContain(KEEP); // untouched page survives intact
  });

  it('drops the source metadata in the rebuilt document', async () => {
    const out = await rebuildRedacted(await makeInput(), new Map([[0, PNG]]));
    const doc = await PDFDocument.load(out);
    expect(doc.getAuthor()).toBeUndefined();
    expect(doc.getTitle()).toBeUndefined();
  });

  it('leaves the document untouched when there are no redactions', async () => {
    const out = await rebuildRedacted(await makeInput(), new Map());
    const outText = await extractText(out);
    expect(outText[0]).toContain(SECRET);
    expect(outText[1]).toContain(KEEP);
  });
});

describe('nudgeBox (RD-1 keyboard region control)', () => {
  const bounds = { width: 1000, height: 800 };
  const base = { x: 100, y: 100, w: 200, h: 100 };

  it('moves the box with arrow keys', () => {
    expect(nudgeBox(base, 'ArrowRight', false, bounds, 10)).toEqual({
      x: 110,
      y: 100,
      w: 200,
      h: 100,
    });
    expect(nudgeBox(base, 'ArrowLeft', false, bounds, 10)).toEqual({
      x: 90,
      y: 100,
      w: 200,
      h: 100,
    });
    expect(nudgeBox(base, 'ArrowDown', false, bounds, 10)).toEqual({
      x: 100,
      y: 110,
      w: 200,
      h: 100,
    });
    expect(nudgeBox(base, 'ArrowUp', false, bounds, 10)).toEqual({ x: 100, y: 90, w: 200, h: 100 });
  });

  it('resizes the box with Shift+arrows', () => {
    expect(nudgeBox(base, 'ArrowRight', true, bounds, 10)).toMatchObject({ w: 210, h: 100 });
    expect(nudgeBox(base, 'ArrowUp', true, bounds, 10)).toMatchObject({ w: 200, h: 90 });
  });

  it('clamps movement to the page edges', () => {
    expect(nudgeBox({ x: 0, y: 0, w: 200, h: 100 }, 'ArrowLeft', false, bounds, 10).x).toBe(0);
    expect(nudgeBox({ x: 800, y: 0, w: 200, h: 100 }, 'ArrowRight', false, bounds, 10).x).toBe(800);
  });

  it('keeps a minimum size and stays within bounds when resizing', () => {
    expect(nudgeBox({ x: 0, y: 0, w: 10, h: 100 }, 'ArrowLeft', true, bounds, 10).w).toBe(10);
    expect(nudgeBox({ x: 900, y: 0, w: 100, h: 100 }, 'ArrowRight', true, bounds, 10).w).toBe(100);
  });

  it('returns the same box for keys it does not handle', () => {
    expect(nudgeBox(base, 'Enter', false, bounds, 10)).toBe(base);
    expect(nudgeBox(base, 'a', true, bounds, 10)).toBe(base);
  });
});
