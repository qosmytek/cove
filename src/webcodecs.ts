// WebCodecs capability probe (Phase 0 — evaluating the hardware fast path).
//
// `isConfigSupported` is cheap and non-committal: it allocates no codec, just
// reports whether a config is supported. Note its limitation — it reports
// *capability*, not whether a hardware codec is actually used. WebCodecs has no
// "require-hardware" mode (only no-preference / prefer-hardware / prefer-software),
// so whether the path is genuinely hardware-accelerated (and therefore fast) is
// answered by the pipeline benchmark, not here. This probe just confirms the
// necessary precondition: that H.264 encode/decode is available at all.

export interface ProbeResult {
  label: string;
  supported: boolean;
  note?: string;
}

type Accel = 'no-preference' | 'prefer-hardware' | 'prefer-software';

// H.264 Baseline L3.1 — represents the 720p output we'd encode.
const ENCODE_CONFIG = {
  codec: 'avc1.42001f',
  width: 1280,
  height: 720,
  bitrate: 2_000_000,
  framerate: 30,
};
// H.264 High L4.0 — represents the 1080p input we'd decode.
const DECODE_CONFIG = { codec: 'avc1.640028', codedWidth: 1920, codedHeight: 1080 };

async function encodeSupported(accel: Accel): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined') return false;
  try {
    const res = await VideoEncoder.isConfigSupported({
      ...ENCODE_CONFIG,
      hardwareAcceleration: accel,
    });
    return res.supported === true;
  } catch {
    return false;
  }
}

async function decodeSupported(accel: Accel): Promise<boolean> {
  if (typeof VideoDecoder === 'undefined') return false;
  try {
    const res = await VideoDecoder.isConfigSupported({
      ...DECODE_CONFIG,
      hardwareAcceleration: accel,
    });
    return res.supported === true;
  } catch {
    return false;
  }
}

export async function probeWebCodecs(): Promise<ProbeResult[]> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoDecoder === 'undefined') {
    return [
      { label: 'WebCodecs API', supported: false, note: 'VideoEncoder/VideoDecoder not present' },
    ];
  }
  // Request prefer-hardware (what the real pipeline would use); support here is the
  // precondition, hardware-vs-software speed is confirmed by the benchmark.
  const [enc, dec] = await Promise.all([
    encodeSupported('prefer-hardware'),
    decodeSupported('prefer-hardware'),
  ]);
  return [
    { label: 'WebCodecs API present', supported: true },
    { label: 'H.264 encode 720p available', supported: enc },
    { label: 'H.264 decode 1080p available', supported: dec },
  ];
}
