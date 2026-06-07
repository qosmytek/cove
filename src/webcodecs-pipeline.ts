// WebCodecs transcode pipeline (Phase 0 benchmark vs ffmpeg.wasm):
//   demux (mp4box) → VideoDecoder → downscale (OffscreenCanvas) → VideoEncoder → mux (mp4-muxer)
// Uses the device's hardware H.264 codecs. Video-only for the spike — audio is
// dropped. Lazily imported from main.ts so mp4box/mp4-muxer stay out of the entry bundle.

import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { MultiBufferStream, Sample, Track, VisualSampleEntry } from 'mp4box';
import { createFile, DataStream, MP4BoxBuffer } from 'mp4box';
import type { CompressOptions } from './options';

export interface WCHandlers {
  onLog?: (line: string) => void;
  onProgress?: (ratio: number) => void;
}

interface Demuxed {
  track: Track;
  samples: Sample[];
  description: Uint8Array;
}

/** Serialize the avcC box and strip its 8-byte header → the AVCDecoderConfigurationRecord. */
function extractDescription(entry: VisualSampleEntry): Uint8Array {
  if (!entry.avcC) throw new Error('input has no avcC box (not H.264?)');
  const stream = new DataStream(); // mp4 boxes are big-endian (DataStream default)
  // avcCBox.write is typed for MultiBufferStream but accepts a DataStream at runtime.
  entry.avcC.write(stream as unknown as MultiBufferStream);
  const boxed = new Uint8Array(stream.buffer, 8);
  const desc = new Uint8Array(boxed.byteLength);
  desc.set(boxed);
  return desc;
}

function demux(file: File): Promise<Demuxed> {
  return new Promise<Demuxed>((resolve, reject) => {
    const mp4 = createFile();
    const samples: Sample[] = [];
    let track: Track | undefined;
    let done = false;

    mp4.onError = (_module, message) => reject(new Error(`mp4box: ${message}`));
    mp4.onReady = (info) => {
      track = info.videoTracks[0];
      if (!track) {
        reject(new Error('no H.264 video track found'));
        return;
      }
      mp4.setExtractionOptions(track.id);
      mp4.start();
    };
    mp4.onSamples = (_id, _user, batch) => {
      if (done || !track) return;
      for (const s of batch) samples.push(s);
      if (samples.length >= track.nb_samples) {
        done = true;
        try {
          resolve({
            track,
            samples,
            description: extractDescription(samples[0].description as VisualSampleEntry),
          });
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      }
    };

    file
      .arrayBuffer()
      .then((ab) => {
        mp4.appendBuffer(MP4BoxBuffer.fromArrayBuffer(ab, 0));
        mp4.flush();
      })
      .catch(reject);
  });
}

export async function compressWebCodecs(
  file: File,
  opts: CompressOptions,
  handlers: WCHandlers = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const log = (m: string): void => handlers.onLog?.(m);

  log('Demuxing…');
  const { track, samples, description } = await demux(file);
  const srcW = track.video?.width ?? track.track_width;
  const srcH = track.video?.height ?? track.track_height;
  const dstH = opts.height;
  const dstW = Math.max(2, Math.round((srcW * dstH) / srcH / 2) * 2); // even width, keep aspect
  const fps =
    track.duration > 0 ? Math.round((track.nb_samples * track.timescale) / track.duration) : 30;
  const total = samples.length;
  log(`${total} frames · ${srcW}×${srcH} → ${dstW}×${dstH} · ~${fps} fps · audio dropped`);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: dstW, height: dstH, frameRate: fps },
    fastStart: 'in-memory',
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => log(`encoder error: ${e.message}`),
  });
  encoder.configure({
    codec: 'avc1.42001f',
    width: dstW,
    height: dstH,
    bitrate: Math.round(2_000_000 * ((dstW * dstH) / (1280 * 720))),
    framerate: fps,
    hardwareAcceleration: 'prefer-hardware',
    avc: { format: 'avc' },
  });

  const canvas = new OffscreenCanvas(dstW, dstH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2D context for downscale');

  let encoded = 0;
  const decoder = new VideoDecoder({
    output: (frame) => {
      ctx.drawImage(frame, 0, 0, dstW, dstH);
      const scaled = new VideoFrame(canvas, {
        timestamp: frame.timestamp,
        duration: frame.duration ?? undefined,
      });
      frame.close();
      encoder.encode(scaled);
      scaled.close();
      encoded += 1;
      handlers.onProgress?.(encoded / total);
    },
    error: (e) => log(`decoder error: ${e.message}`),
  });
  decoder.configure({
    codec: track.codec,
    codedWidth: srcW,
    codedHeight: srcH,
    description,
    hardwareAcceleration: 'prefer-hardware',
  });

  for (const s of samples) {
    if (!s.data) continue;
    decoder.decode(
      new EncodedVideoChunk({
        type: s.is_sync ? 'key' : 'delta',
        timestamp: (s.cts * 1e6) / s.timescale,
        duration: (s.duration * 1e6) / s.timescale,
        data: s.data,
      }),
    );
  }

  await decoder.flush();
  await encoder.flush();
  muxer.finalize();
  decoder.close();
  encoder.close();

  return new Uint8Array(muxer.target.buffer);
}
