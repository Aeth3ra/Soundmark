/**
 * AudioBuffer processing and WAV encoding helpers. Network requests and
 * downloads stay in audioService.js. Rendering uses the Web Audio API.
 */
import { measureAudioBuffer } from "./audioAnalysis";

/**
 * Copies the [startSeconds, endSeconds) range out of a decoded AudioBuffer
 * into a new, standalone AudioBuffer.
 *
 * @param {AudioBuffer} audioBuffer - full decoded track from the source file
 * @param {number} startSeconds
 * @param {number} endSeconds
 * @returns {AudioBuffer} a new buffer containing just the selected region
 */
export function sliceAudioBuffer(audioBuffer, startSeconds, endSeconds) {
  const sampleRate = audioBuffer.sampleRate;
  const start = Math.max(0, Math.min(startSeconds, endSeconds));
  const end = Math.min(audioBuffer.duration, Math.max(startSeconds, endSeconds));

  const startSample = Math.floor(start * sampleRate);
  const endSample = Math.min(audioBuffer.length, Math.ceil(end * sampleRate));
  const frameCount = endSample - startSample;

  if (frameCount <= 0) {
    throw new Error("Selected region is empty.");
  }

  // The AudioBuffer constructor lets us build a buffer without needing an
  // AudioContext instance around (which we'd otherwise have to create and
  // remember to close).
  const sliced = new AudioBuffer({
    numberOfChannels: audioBuffer.numberOfChannels,
    length: frameCount,
    sampleRate
  });

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const sourceData = audioBuffer.getChannelData(channel);
    const slicedData = sliced.getChannelData(channel);
    slicedData.set(sourceData.subarray(startSample, endSample));
  }

  return sliced;
}

// Render one region through a GainNode, preserving its channel layout.
async function renderGain(audioBuffer, gain) {
  const OfflineContext = globalThis.OfflineAudioContext ||
    globalThis.webkitOfflineAudioContext;
  if (!OfflineContext) {
    throw new Error("This browser does not support offline audio processing.");
  }

  const context = new OfflineContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  const source = context.createBufferSource();
  const gainNode = context.createGain();
  source.buffer = audioBuffer;
  gainNode.channelCount = audioBuffer.numberOfChannels;
  gainNode.channelCountMode = "explicit";
  gainNode.channelInterpretation = "discrete";
  gainNode.gain.setValueAtTime(gain, 0);
  source.connect(gainNode);
  gainNode.connect(context.destination);
  source.start(0);

  try {
    return await context.startRendering();
  } finally {
    source.disconnect();
    gainNode.disconnect();
  }
}

/** Apply saved effects to the full track. The source buffer is never mutated. */
export async function applyEffectsChain(audioBuffer, effects = []) {
  if (!Array.isArray(effects)) {
    throw new Error("Effects must be an array.");
  }
  for (const effect of effects) {
    if (!effect || typeof effect.enabled !== "boolean" ||
        !Number.isSafeInteger(effect.order) || effect.order < 0) {
      throw new Error("Invalid effect settings.");
    }
  }

  const ordered = effects.filter((effect) => effect.enabled).sort((a, b) => {
    const order = a.order - b.order;
    const created = new Date(a.createdAt ?? 0).getTime() -
      new Date(b.createdAt ?? 0).getTime();
    const aId = String(a._id ?? "");
    const bId = String(b._id ?? "");
    return order || created || (aId < bId ? -1 : aId > bId ? 1 : 0);
  });
  if (ordered.length === 0) return audioBuffer;

  // One private working copy; overlapping effects run in the saved order.
  const output = new AudioBuffer({
    numberOfChannels: audioBuffer.numberOfChannels,
    length: audioBuffer.length,
    sampleRate: audioBuffer.sampleRate
  });
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    output.getChannelData(channel).set(audioBuffer.getChannelData(channel));
  }

  for (const effect of ordered) {
    if (effect.type !== "normalize") {
      throw new Error(`Rendering ${effect.type} effects is not implemented yet.`);
    }
    const { start, end, params } = effect;
    if (!Number.isFinite(start) || !Number.isFinite(end) ||
        start < 0 || end <= start || end > output.duration) {
      throw new Error("An effect is outside the audio duration.");
    }
    if (!params || params.mode !== "rms" ||
        !Number.isFinite(params.targetRms) ||
        params.targetRms <= 0 || params.targetRms > 1) {
      throw new Error("Invalid normalisation settings. Recreate this effect with a target RMS greater than 0 and at most 1.");
    }

    const region = sliceAudioBuffer(output, start, end);
    const { rms, peak } = measureAudioBuffer(region);
    if (rms === 0) continue; // Gain cannot turn silence into sound.

    const gain = params.targetRms / rms;
    if (!Number.isFinite(Math.fround(gain))) {
      throw new Error("This region is too quiet to normalise with a GainNode.");
    }
    if (peak * gain > 1 + 1e-6) {
      const maximumRms = rms / peak;
      throw new Error(
        `This target would clip. Choose a target RMS of ${maximumRms} or lower.`
      );
    }

    const rendered = await renderGain(region, gain);
    const startSample = Math.floor(start * output.sampleRate);
    for (let channel = 0; channel < output.numberOfChannels; channel++) {
      output.getChannelData(channel).set(rendered.getChannelData(channel), startSample);
    }
  }

  return output;
}

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Encodes an AudioBuffer as an uncompressed 16-bit PCM WAV Blob.
 * WAV is used (rather than re-encoding to the original codec) because it
 * requires no external encoder library and is lossless, which matters
 * once effects processing is applying real DSP to the samples.
 *
 * @param {AudioBuffer} audioBuffer
 * @returns {Blob}
 */
export function encodeWavBlob(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size (PCM)
  view.setUint16(20, 1, true); // audio format: 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channelData = [];
  for (let channel = 0; channel < numChannels; channel++) {
    channelData.push(audioBuffer.getChannelData(channel));
  }

  let offset = 44;
  for (let frame = 0; frame < numFrames; frame++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Filename-safe time label, e.g. 65.4 -> "1m05s".
 * (formatTime()/formatMs() in utils/time.js use a colon, which isn't a
 * valid filename character on Windows.)
 */
export function secondsToFileLabel(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return minutes > 0 ? `${minutes}m${secs.toString().padStart(2, "0")}s` : `${secs}s`;
}
