import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The single-file redactor build (ADR-0004 / feature 02): one self-contained redact.html with the
// JS, CSS, and the inlined pdf.js worker all folded in, so it runs from file:// — a USB stick, an
// email attachment, an air-gapped machine — with zero network requests. Scoped to one tool (SF-2);
// no service worker / PWA. `__SINGLE_FILE__` switches off the same-origin standard-font URL (there
// is no server to serve it) — see src/tools/redact.ts. Build: `npm run build:single` → dist-single/.
export default defineConfig({
  define: { __SINGLE_FILE__: 'true' },
  // No public/ copy: the one file inlines all it needs (worker inlined, fonts omitted), so the
  // ffmpeg cores / fonts / icon under public/ must not be copied beside it.
  publicDir: false,
  build: {
    outDir: 'dist-single',
    rollupOptions: { input: 'redact.html' },
  },
  plugins: [viteSingleFile()],
});
