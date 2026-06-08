// WebCodecs transcode pipeline:
//   demux (mp4box) → VideoDecoder → downscale (OffscreenCanvas) → VideoEncoder → mux (mp4-muxer)
// Uses the device's hardware H.264 codecs. Audio: AAC-LC is passed through (remuxed) to
// keep sound without re-encoding; other audio codecs throw so the orchestrator falls back
// to ffmpeg. Lazily imported so mp4box/mp4-muxer stay out of the entry bundle.

import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { MultiBufferStream, Sample, Track, VisualSampleEntry } from 'mp4box';
import { createFile, DataStream, MP4BoxBuffer } from 'mp4box';
import { aacLcAsc } from './aac';
import { type CompressOptions, qualityBitrate } from './options';

// Cap queued decoder + encoder frames so a long clip doesn't pile up frames in memory (FR-V7).
const MAX_INFLIGHT_FRAMES = 8;
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

export interface WCHandlers {
  onLog?: (line: string) => void;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

interface Demuxed {
  videoTrack: Track;
  videoSamples: Sample[];
  videoDescription: Uint8Array;
  audio?: { track: Track; samples: Sample[] };
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
    const videoSamples: Sample[] = [];
    const audioSamples: Sample[] = [];
    let videoTrack: Track | undefined;
    let audioTrack: Track | undefined;
    let done = false;

    mp4.onError = (_module, message) => reject(new Error(`mp4box: ${message}`));
    mp4.onReady = (info) => {
      videoTrack = info.videoTracks[0];
      if (!videoTrack) {
        reject(new Error('no H.264 video track found'));
        return;
      }
      audioTrack = info.audioTracks[0]; // may be undefined (no audio)
      mp4.setExtractionOptions(videoTrack.id);
      if (audioTrack) mp4.setExtractionOptions(audioTrack.id);
      mp4.start();
    };
    mp4.onSamples = (id, _user, batch) => {
      if (done) return;
      if (videoTrack && id === videoTrack.id) {
        for (const s of batch) videoSamples.push(s);
      } else if (audioTrack && id === audioTrack.id) {
        for (const s of batch) audioSamples.push(s);
      }
      const videoReady = videoTrack !== undefined && videoSamples.length >= videoTrack.nb_samples;
      const audioReady = audioTrack === undefined || audioSamples.length >= audioTrack.nb_samples;
      if (videoTrack && videoReady && audioReady) {
        done = true;
        try {
          resolve({
            videoTrack,
            videoSamples,
            videoDescription: extractDescription(videoSamples[0].description as VisualSampleEntry),
            audio: audioTrack ? { track: audioTrack, samples: audioSamples } : undefined,
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
  const { signal } = handlers;
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');

  log('Demuxing…');
  const { videoTrack, videoSamples, videoDescription, audio } = await demux(file);
  const srcW = videoTrack.video?.width ?? videoTrack.track_width;
  const srcH = videoTrack.video?.height ?? videoTrack.track_height;
  const dstH = opts.height;
  const dstW = Math.max(2, Math.round((srcW * dstH) / srcH / 2) * 2); // even width, keep aspect
  const fps =
    videoTrack.duration > 0
      ? Math.round((videoTrack.nb_samples * videoTrack.timescale) / videoTrack.duration)
      : 30;

  // Audio: pass AAC-LC through unchanged; anything else throws → ffmpeg fallback (re-encodes).
  let audioOut: { channels: number; sampleRate: number; asc: Uint8Array } | undefined;
  if (audio) {
    if (audio.track.codec !== 'mp4a.40.2') {
      throw new Error(`audio codec "${audio.track.codec}" not supported by the WebCodecs path`);
    }
    const channels = audio.track.audio?.channel_count ?? 2;
    const sampleRate = audio.track.audio?.sample_rate ?? 0;
    const asc = aacLcAsc(sampleRate, channels);
    if (!asc) {
      throw new Error(`audio sample rate ${sampleRate} Hz not supported by the WebCodecs path`);
    }
    audioOut = { channels, sampleRate, asc };
  }

  log(
    `${videoSamples.length} frames · ${srcW}×${srcH} → ${dstW}×${dstH} · ~${fps} fps · ` +
      `audio: ${audioOut ? 'AAC passthrough' : 'none'}`,
  );

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: dstW, height: dstH, frameRate: fps },
    ...(audioOut && {
      audio: {
        codec: 'aac' as const,
        numberOfChannels: audioOut.channels,
        sampleRate: audioOut.sampleRate,
      },
    }),
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
    bitrate: opts.videoBitrate ?? qualityBitrate(opts.quality, dstW, dstH),
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
      handlers.onProgress?.(encoded / videoSamples.length);
    },
    error: (e) => log(`decoder error: ${e.message}`),
  });
  decoder.configure({
    codec: videoTrack.codec,
    codedWidth: srcW,
    codedHeight: srcH,
    description: videoDescription,
    hardwareAcceleration: 'prefer-hardware',
  });

  const onAbort = (): void => {
    if (decoder.state !== 'closed') decoder.close();
    if (encoder.state !== 'closed') encoder.close();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  for (const s of videoSamples) {
    if (!s.data) continue;
    // Backpressure: keep only a few frames in flight so a long clip doesn't pile up
    // decoded/encoded frames in memory (the bulk of the Phase 0 peak).
    while (
      decoder.decodeQueueSize + encoder.encodeQueueSize >= MAX_INFLIGHT_FRAMES &&
      !signal?.aborted
    ) {
      await tick();
    }
    if (signal?.aborted) break;
    decoder.decode(
      new EncodedVideoChunk({
        type: s.is_sync ? 'key' : 'delta',
        timestamp: (s.cts * 1e6) / s.timescale,
        duration: (s.duration * 1e6) / s.timescale,
        data: s.data,
      }),
    );
  }

  if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
  await decoder.flush();
  await encoder.flush();

  // Remux the original AAC frames alongside the re-encoded video. Both reference the
  // source timeline (µs), so they stay in sync; mp4-muxer interleaves on finalize.
  if (audio && audioOut) {
    const meta: EncodedAudioChunkMetadata = {
      decoderConfig: {
        codec: 'mp4a.40.2',
        sampleRate: audioOut.sampleRate,
        numberOfChannels: audioOut.channels,
        description: audioOut.asc,
      },
    };
    let first = true;
    for (const s of audio.samples) {
      if (!s.data) continue;
      muxer.addAudioChunkRaw(
        s.data,
        'key',
        (s.cts * 1e6) / s.timescale,
        (s.duration * 1e6) / s.timescale,
        first ? meta : undefined,
      );
      first = false;
    }
  }

  muxer.finalize();
  decoder.close();
  encoder.close();
  signal?.removeEventListener('abort', onAbort);

  return new Uint8Array(muxer.target.buffer);
}
