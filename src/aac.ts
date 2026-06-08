// AAC AudioSpecificConfig helpers — pure (no DOM/mp4box) so the WebCodecs path can
// pass AAC-LC audio through with a correct esds, and so the bit-math is unit-testable.

const FREQ_INDEX: Record<number, number> = {
  96000: 0,
  88200: 1,
  64000: 2,
  48000: 3,
  44100: 4,
  32000: 5,
  24000: 6,
  22050: 7,
  16000: 8,
  12000: 9,
  11025: 10,
  8000: 11,
  7350: 12,
};

/**
 * The 2-byte AAC-LC AudioSpecificConfig for a sample rate + channel count, or
 * `undefined` if the sample rate isn't a standard AAC rate (caller should then fall
 * back rather than emit a wrong config).
 */
export function aacLcAsc(sampleRate: number, channels: number): Uint8Array | undefined {
  const freqIndex = FREQ_INDEX[sampleRate];
  if (freqIndex === undefined) return undefined;
  const audioObjectType = 2; // AAC-LC
  return new Uint8Array([
    (audioObjectType << 3) | (freqIndex >> 1),
    ((freqIndex & 1) << 7) | (channels << 3),
  ]);
}
