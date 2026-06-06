import { defineConfig } from 'vite';

// Cross-origin isolation (COOP/COEP) is required for SharedArrayBuffer and thus the
// multi-threaded ffmpeg core (ADR-0006 / ADR-0002). Apply to dev and preview servers.
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  // ffmpeg.wasm uses workers + import.meta.url tricks that don't survive dep pre-bundling.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
});
