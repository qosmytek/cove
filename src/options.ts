// Compression knobs. Kept dependency-free so the shell (main.ts) can read defaults
// and populate controls WITHOUT importing the heavy engine module — engine.ts only
// imports the type from here (erased at build time), so the lazy split is preserved.

export interface CompressOptions {
  preset: string; // x264 speed/efficiency preset (faster = quicker, larger files)
  crf: number; // quality: lower = better quality + larger file (0–51)
  height: number; // output height in px; width is derived to keep aspect ratio (-2)
}

export const PRESETS = ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium'] as const;

export const DEFAULT_OPTIONS: CompressOptions = { preset: 'veryfast', crf: 28, height: 720 };
