/**
 * Pure, framework-free helpers for turning a decoded AudioBuffer region
 * into a downloadable WAV file. Kept separate from audioService.js so
 * they're easy to unit test without stubbing Meteor/fetch/DOM.
 */

/**
 * Copies the [startSeconds, endSeconds) range out of a decoded AudioBuffer
 * into a new, standalone AudioBuffer.
 *
 * @param {AudioBuffer} audioBuffer - full decoded track, e.g. from
 *   wavesurferInstance.getDecodedData()
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

/**
 * Extension point for the not-yet-built effects pipeline.
 *
 * Effects (gain, EQ, reverb, etc., presumably via Tone.js given it's
 * already a dependency) don't exist yet in Soundmark. Once they do, each
 * effect the user has applied to the track should be describable as a
 * descriptor here, and this function should render the sliced region
 * through the same chain that's currently audible in the player - that's
 * what "preserve applied effects" means for export. Wiring that up will
 * probably mean rendering `audioBuffer` through an OfflineAudioContext (or
 * Tone.Offline) with each effect's node inserted in order, then returning
 * the rendered buffer.
 *
 * For now there's nothing to apply, so this is an identity passthrough -
 * callers can start threading an `effects` array through today and it'll
 * start doing something the moment effects processing lands.
 *
 * @param {AudioBuffer} audioBuffer
 * @param {Array} effects - reserved for future effect descriptors
 * @returns {AudioBuffer}
 */
export function applyEffectsChain(audioBuffer, effects = []) {
  if (effects.length > 0) {
    console.warn(
      "Audio effects are not implemented yet; exporting the selection without them applied."
    );
  }
  return audioBuffer;
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
