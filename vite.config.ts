import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
  // Hosted build: the single-file flag is off (vite.config.single.ts turns it on).
  define: { __SINGLE_FILE__: 'false' },
  plugins: [
    // Offline PWA (FR-P5). injectManifest = our own SW (src/sw.ts) with Workbox's precache
    // manifest injected. Updates install quietly and take over on the next launch (no prompt).
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt', // SW waits; no auto-reload mid-task and no nagging prompt UI
      injectRegister: 'auto',
      manifest: {
        name: 'Cove',
        short_name: 'Cove',
        description: 'Compress video on your device — nothing is uploaded.',
        start_url: '/',
        display: 'standalone',
        background_color: '#1a1a1a',
        theme_color: '#1a1a1a',
      },
      // Generate the PNG/maskable/apple-touch icon set from public/icon.svg (pwa-assets.config.ts).
      pwaAssets: { config: true, overrideManifestIcons: true },
      injectManifest: {
        // Precache the light shell only; heavy engines are cached on first use (sw.ts) — the
        // ffmpeg cores (public/ffmpeg) and the redactor's pdf.js bundle (redact-*.js; its .mjs
        // worker already falls outside globPatterns). Keeps every visitor's install small (R1).
        // The web manifest is precached by the plugin itself; don't also glob it, or the
        // pwaAssets icon-injection produces a second entry with a different revision and
        // workbox throws add-to-cache-list-conflicting-entries (SW registration then fails).
        globPatterns: ['**/*.{html,css,js,svg}'],
        globIgnores: ['ffmpeg/**', 'assets/redact-*.js'],
      },
      devOptions: { enabled: false },
    }),
  ],
});
