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
        // Precache the light shell only; the heavy ffmpeg cores are cached on first use (sw.ts).
        globPatterns: ['**/*.{html,css,js,svg,webmanifest}'],
        globIgnores: ['ffmpeg/**'],
      },
      devOptions: { enabled: false },
    }),
  ],
});
