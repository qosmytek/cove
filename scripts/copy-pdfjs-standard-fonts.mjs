// Vendor pdf.js standard font data into public/pdfjs/standard_fonts/ so the redactor renders the
// base-14 PDF fonts (Helvetica/Times/Courier/Symbol/…) faithfully even when a PDF doesn't embed
// them — served same-origin, so there is zero egress (like the ffmpeg cores). Run by
// predev/prebuild. Output is gitignored; nothing here is committed. The bundled LICENSE_* files
// ship alongside the fonts to satisfy their licenses.

import { cpSync, existsSync, mkdirSync } from 'node:fs';

const src = 'node_modules/pdfjs-dist/standard_fonts';
const dest = 'public/pdfjs/standard_fonts';

if (!existsSync(src)) {
  throw new Error(`Could not find ${src} — is pdfjs-dist installed? (run \`npm install\`)`);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied pdf.js standard fonts: ${src} -> ${dest}`);
