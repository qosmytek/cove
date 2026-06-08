// Calm, user-facing copy for failures and capability states. The raw detail always stays in
// the Details log; these map it to something a non-technical user can act on (FR-P7).

export function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('declined')) {
    return 'Compression needs a one-time engine download — reload and choose Continue to proceed.';
  }
  if (m.includes('memory') || m.includes('allocation')) {
    return 'This video may be too large for this device. Try a lower resolution or a smaller target size.';
  }
  if (
    m.includes('unsupported') ||
    m.includes('codec') ||
    m.includes('no h.264') ||
    m.includes('no video') ||
    m.includes('mp4box')
  ) {
    return "Couldn't read this video — it may be in an unsupported format or corrupted.";
  }
  return 'Something went wrong while compressing. See Details for the full log.';
}

/** A one-line note on which compression path this browser will use (FR-P7). */
export function capabilityNote(webCodecsAvailable: boolean, crossOriginIsolated: boolean): string {
  if (webCodecsAvailable) return 'Hardware-accelerated compression, entirely on your device.';
  if (crossOriginIsolated) {
    return 'No hardware fast path here — Cove will use a downloadable engine (multi-threaded).';
  }
  return 'Compatibility mode: no hardware fast path and limited threading, so compression is slower.';
}
