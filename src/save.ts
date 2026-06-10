// Save the result to disk: File System Access API (save-in-place) where available,
// otherwise a normal browser download. FR-V5 / ADR-0003.

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}
declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}

export type SaveResult = 'saved' | 'downloaded' | 'cancelled';

/** Whether the browser can save in place (File System Access API). */
export function canSaveInPlace(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

/**
 * Write the output to disk. Prefers the File System Access API (lets the user choose the
 * location and saves in place); falls back to a download if it's unavailable or fails.
 * Returns 'cancelled' if the user dismisses the save dialog.
 */
export interface SaveFormat {
  /** MIME type for the Blob and the save-picker filter (default 'video/mp4'). */
  mimeType?: string;
  /** Human label shown in the save picker (default 'MP4 video'). */
  description?: string;
  /** Allowed extensions for the save picker (default ['.mp4']). */
  extensions?: string[];
}

export async function saveOutput(
  data: Uint8Array<ArrayBuffer>,
  suggestedName: string,
  format: SaveFormat = {},
): Promise<SaveResult> {
  const { mimeType = 'video/mp4', description = 'MP4 video', extensions = ['.mp4'] } = format;
  const blob = new Blob([data], { type: mimeType });

  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description, accept: { [mimeType]: extensions } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Any other failure (e.g. permission) falls through to a download so the user still
      // gets their file.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
