import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generate the PWA icon set (192/512 + maskable + apple-touch + favicon) from the SVG mark,
// so install works beyond Chrome. Source is the single committed icon; PNGs are build output.
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/icon.svg'],
});
