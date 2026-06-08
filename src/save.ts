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
export async function saveOutput(
  data: Uint8Array<ArrayBuffer>,
  suggestedName: string,
): Promise<SaveResult> {
  const blob = new Blob([data], { type: 'video/mp4' });

  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } }],
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
