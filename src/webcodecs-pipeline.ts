// WebCodecs transcode pipeline (streaming + backpressured, FR-V7):
//   read file in ranges → demux (mp4box) → VideoDecoder → downscale (OffscreenCanvas)
//   → VideoEncoder → mux (mp4-muxer)
// The input is fed to mp4box in 4 MiB ranges following its requested offsets (it skips the
// mdat to find a trailing moov, then seeks back), samples are released as they're consumed,
// and the decode/encode pipeline is bounded — so a long clip never holds the whole input or
// every frame at once. AAC-LC audio is passed through (remuxed); other audio codecs throw so
// the orchestrator falls back to ffmpeg. Lazily imported.

import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { MultiBufferStream, Sample, Track, VisualSampleEntry } from 'mp4box';
import { createFile, DataStream, MP4BoxBuffer } from 'mp4box';
import { aacLcAsc } from './aac';
import { type CompressOptions, qualityBitrate } from './options';

const READ_CHUNK = 4 * 1024 * 1024; // 4 MiB ranges fed to mp4box
const MAX_INFLIGHT_FRAMES = 8; // decoder + encoder queued frames (heap bound)
const MAX_QUEUED_SAMPLES = 64; // demuxed-but-undecoded video samples held in memory
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

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

export interface WCHandlers {
  onLog?: (line: string) => void;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}

export async function compressWebCodecs(
  file: File,
  opts: CompressOptions,
  handlers: WCHandlers = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const log = (m: string): void => handlers.onLog?.(m);
  const { signal } = handlers;
  const aborted = (): boolean => signal?.aborted === true;
  if (aborted()) throw new DOMException('aborted', 'AbortError');

  log('Demuxing…');
  const mp4 = createFile();

  // Demux state, populated as the file streams in.
  let videoTrack: Track | undefined;
  let audioTrack: Track | undefined;
  let audioOut: { channels: number; sampleRate: number; asc: Uint8Array } | undefined;
  let audioUnsupported: string | undefined;
  let demuxError: Error | undefined;
  const videoQueue: Sample[] = [];
  const audioQueue: Sample[] = [];
  let resolveReady: (() => void) | undefined;
  const ready = new Promise<void>((r) => {
    resolveReady = r;
  });

  mp4.onError = (_module, message) => {
    demuxError = new Error(`mp4box: ${message}`);
    resolveReady?.();
  };
  mp4.onReady = (info) => {
    videoTrack = info.videoTracks[0];
    audioTrack = info.audioTracks[0];
    if (videoTrack) {
      mp4.setExtractionOptions(videoTrack.id);
      if (audioTrack?.codec === 'mp4a.40.2') {
        const channels = audioTrack.audio?.channel_count ?? 2;
        const sampleRate = audioTrack.audio?.sample_rate ?? 0;
        const asc = aacLcAsc(sampleRate, channels);
        if (asc) {
          audioOut = { channels, sampleRate, asc };
          mp4.setExtractionOptions(audioTrack.id);
        } else {
          audioUnsupported = `sample rate ${sampleRate} Hz`;
        }
      } else if (audioTrack) {
        audioUnsupported = `codec "${audioTrack.codec}"`;
      }
      mp4.start();
    }
    resolveReady?.();
  };
  mp4.onSamples = (id, _user, samples) => {
    if (videoTrack && id === videoTrack.id) {
      for (const s of samples) videoQueue.push(s);
    } else if (audioTrack && id === audioTrack.id) {
      for (const s of samples) audioQueue.push(s);
    }
  };

  // Producer: feed the file in ranges, following mp4box's requested next offset (it skips
  // the mdat while finding the moov, then seeks back to it — so we must honor appendBuffer's
  // return, not read straight through). Pauses when the consumer is behind.
  let pos = 0;
  let demuxComplete = false;
  const maxIterations = Math.ceil(file.size / READ_CHUNK) * 2 + 64; // converge guard
  const produce = async (): Promise<void> => {
    try {
      let iterations = 0;
      while (pos < file.size && !demuxError && !aborted()) {
        if (++iterations > maxIterations) throw new Error('demux did not converge');
        while (videoQueue.length >= MAX_QUEUED_SAMPLES && !demuxError && !aborted()) await tick();
        const end = Math.min(pos + READ_CHUNK, file.size);
        const buf = MP4BoxBuffer.fromArrayBuffer(await file.slice(pos, end).arrayBuffer(), pos);
        const next = mp4.appendBuffer(buf);
        pos = typeof next === 'number' && next !== pos ? next : end;
      }
      if (!aborted()) mp4.flush();
    } catch (e) {
      demuxError ??= e instanceof Error ? e : new Error(String(e));
    } finally {
      demuxComplete = true;
      resolveReady?.();
    }
  };
  const produceP = produce();

  await ready;
  if (demuxError) throw demuxError;
  if (!videoTrack) throw new Error('no H.264 video track found');
  if (audioUnsupported) {
    throw new Error(`audio ${audioUnsupported} not supported by the WebCodecs path`);
  }
  const vt = videoTrack;

  const srcW = vt.video?.width ?? vt.track_width;
  const srcH = vt.video?.height ?? vt.track_height;
  const dstH = opts.height;
  const dstW = Math.max(2, Math.round((srcW * dstH) / srcH / 2) * 2); // even width, keep aspect
  const fps = vt.duration > 0 ? Math.round((vt.nb_samples * vt.timescale) / vt.duration) : 30;
  const total = vt.nb_samples;

  log(
    `${total} frames · ${srcW}×${srcH} → ${dstW}×${dstH} · ~${fps} fps · ` +
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
      handlers.onProgress?.(encoded / total);
    },
    error: (e) => log(`decoder error: ${e.message}`),
  });
  let decoderConfigured = false;

  const onAbort = (): void => {
    if (decoder.state !== 'closed') decoder.close();
    if (encoder.state !== 'closed') encoder.close();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  // Audio passthrough: drain progressively (and release) so mp4box can free the underlying
  // file buffers as both tracks advance — otherwise interleaved audio pins the whole input.
  const audioMeta: EncodedAudioChunkMetadata | undefined = audioOut && {
    decoderConfig: {
      codec: 'mp4a.40.2',
      sampleRate: audioOut.sampleRate,
      numberOfChannels: audioOut.channels,
      description: audioOut.asc,
    },
  };
  let audioFirst = true;
  const drainAudio = (): void => {
    if (!(audioOut && audioTrack)) return;
    let last = -1;
    while (audioQueue.length > 0) {
      const s = audioQueue.shift();
      if (!s) break;
      if (s.data) {
        muxer.addAudioChunkRaw(
          s.data,
          'key',
          (s.cts * 1e6) / s.timescale,
          (s.duration * 1e6) / s.timescale,
          audioFirst ? audioMeta : undefined,
        );
        audioFirst = false;
      }
      last = s.number;
    }
    if (last >= 0) mp4.releaseUsedSamples(audioTrack.id, last);
  };

  // Consumer: decode video with a bounded in-flight window, releasing each sample as it's
  // handed off; configure the decoder lazily from the first sample's description.
  const consume = async (): Promise<void> => {
    while (!aborted()) {
      drainAudio();
      const s = videoQueue.shift();
      if (!s) {
        if (demuxComplete) break;
        await tick();
        continue;
      }
      while (
        decoder.decodeQueueSize + encoder.encodeQueueSize >= MAX_INFLIGHT_FRAMES &&
        !aborted()
      ) {
        await tick();
      }
      if (aborted() || !s.data) continue;
      if (!decoderConfigured) {
        decoder.configure({
          codec: vt.codec,
          codedWidth: srcW,
          codedHeight: srcH,
          description: extractDescription(s.description as VisualSampleEntry),
          hardwareAcceleration: 'prefer-hardware',
        });
        decoderConfigured = true;
      }
      decoder.decode(
        new EncodedVideoChunk({
          type: s.is_sync ? 'key' : 'delta',
          timestamp: (s.cts * 1e6) / s.timescale,
          duration: (s.duration * 1e6) / s.timescale,
          data: s.data,
        }),
      );
      mp4.releaseUsedSamples(vt.id, s.number);
    }
    drainAudio();
  };

  await Promise.all([produceP, consume()]);
  if (demuxError) throw demuxError;
  if (aborted()) throw new DOMException('aborted', 'AbortError');
  if (!decoderConfigured) throw new Error('no video samples were decoded');

  await decoder.flush();
  await encoder.flush();
  muxer.finalize();
  decoder.close();
  encoder.close();
  signal?.removeEventListener('abort', onAbort);

  return new Uint8Array(muxer.target.buffer);
}
