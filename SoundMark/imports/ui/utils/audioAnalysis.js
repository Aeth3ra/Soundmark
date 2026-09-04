import Meyda from "meyda";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createRegionSource = (audioBuffer, startSeconds, endSeconds) => {
  if (!audioBuffer || !audioBuffer.sampleRate || !audioBuffer.length) return null;

  const start = clamp(Math.min(startSeconds, endSeconds), 0, audioBuffer.duration);
  const end = clamp(Math.max(startSeconds, endSeconds), 0, audioBuffer.duration);
  const startSample = Math.floor(start * audioBuffer.sampleRate);
  const endSample = Math.min(audioBuffer.length, Math.ceil(end * audioBuffer.sampleRate));
  const channels = Array.from(
    { length: audioBuffer.numberOfChannels },
    (_, channel) => audioBuffer.getChannelData(channel)
  );

  if (endSample <= startSample || channels.length === 0) return null;

  return {
    channels,
    sampleRate: audioBuffer.sampleRate,
    startSample,
    length: endSample - startSample,
    duration: end - start
  };
};

const readMonoSample = (source, regionIndex) => {
  const sourceIndex = source.startSample + regionIndex;
  let sample = 0;

  for (const channel of source.channels) sample += channel[sourceIndex] || 0;
  return sample / source.channels.length;
};

const regionRms = (source) => {
  const stride = Math.max(1, Math.floor(source.length / 100000));
  let energy = 0;
  let count = 0;

  for (let index = 0; index < source.length; index += stride) {
    const sample = readMonoSample(source, index);
    energy += sample * sample;
    count += 1;
  }

  return count ? Math.sqrt(energy / count) : 0;
};

const estimateBpm = (source) => {
  if (source.duration < 2) return null;

  const targetEnvelopeRate = 100;
  const maximumEnvelopeBins = 30000;
  const binSize = Math.max(
    1,
    Math.ceil(source.length / maximumEnvelopeBins),
    Math.floor(source.sampleRate / targetEnvelopeRate)
  );
  const binCount = Math.floor(source.length / binSize);
  const envelope = new Float32Array(binCount);

  for (let bin = 0; bin < binCount; bin += 1) {
    const firstSample = bin * binSize;
    const sampleStride = Math.max(1, Math.floor(binSize / 128));
    let amplitude = 0;
    let count = 0;

    for (let offset = 0; offset < binSize; offset += sampleStride) {
      amplitude += Math.abs(readMonoSample(source, firstSample + offset));
      count += 1;
    }

    envelope[bin] = count ? amplitude / count : 0;
  }

  const onsets = new Float32Array(binCount);
  for (let index = 2; index < binCount; index += 1) {
    const localAverage = (envelope[index - 1] + envelope[index - 2]) / 2;
    onsets[index] = Math.max(0, envelope[index] - localAverage);
  }

  const envelopeRate = source.sampleRate / binSize;
  const minimumLag = Math.max(1, Math.floor((envelopeRate * 60) / 200));
  const maximumLag = Math.min(
    binCount - 1,
    Math.ceil((envelopeRate * 60) / 60)
  );
  let bestLag = 0;
  let bestScore = 0;

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let correlation = 0;
    let earlierEnergy = 0;
    let laterEnergy = 0;

    for (let index = lag; index < onsets.length; index += 1) {
      const earlier = onsets[index - lag];
      const later = onsets[index];
      correlation += earlier * later;
      earlierEnergy += earlier * earlier;
      laterEnergy += later * later;
    }

    const denominator = Math.sqrt(earlierEnergy * laterEnergy);
    const score = denominator ? correlation / denominator : 0;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  if (!bestLag || bestScore < 0.15) return null;
  return Math.round((60 * envelopeRate) / bestLag);
};

const estimateFramePitch = (frame, sampleRate) => {
  let mean = 0;
  for (const sample of frame) mean += sample;
  mean /= frame.length;

  let energy = 0;
  for (let index = 0; index < frame.length; index += 1) {
    frame[index] -= mean;
    energy += frame[index] * frame[index];
  }
  if (Math.sqrt(energy / frame.length) < 0.001) return null;

  const minimumLag = Math.max(1, Math.floor(sampleRate / 2000));
  const maximumLag = Math.min(Math.floor(sampleRate / 55), Math.floor(frame.length / 2));
  const correlations = new Float32Array(maximumLag + 1);
  let bestLag = 0;
  let bestCorrelation = 0;

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let correlation = 0;
    let firstEnergy = 0;
    let secondEnergy = 0;

    for (let index = 0; index < frame.length - lag; index += 1) {
      const first = frame[index];
      const second = frame[index + lag];
      correlation += first * second;
      firstEnergy += first * first;
      secondEnergy += second * second;
    }

    const denominator = Math.sqrt(firstEnergy * secondEnergy);
    correlations[lag] = denominator ? correlation / denominator : 0;
    if (correlations[lag] > bestCorrelation) {
      bestCorrelation = correlations[lag];
      bestLag = lag;
    }
  }

  if (!bestLag || bestCorrelation < 0.55) return null;

  const acceptableCorrelation = Math.max(0.55, bestCorrelation * 0.9);
  for (let lag = minimumLag + 1; lag < bestLag; lag += 1) {
    if (
      correlations[lag] >= acceptableCorrelation &&
      correlations[lag] > correlations[lag - 1] &&
      correlations[lag] >= correlations[lag + 1]
    ) {
      bestLag = lag;
      break;
    }
  }

  const before = correlations[bestLag - 1] || correlations[bestLag];
  const centre = correlations[bestLag];
  const after = correlations[bestLag + 1] || correlations[bestLag];
  const curve = before - 2 * centre + after;
  const offset = curve ? 0.5 * (before - after) / curve : 0;

  return sampleRate / (bestLag + clamp(offset, -1, 1));
};

const estimatePitch = (source) => {
  const decimation = Math.max(1, Math.ceil(source.sampleRate / 12000));
  const analysisSampleRate = source.sampleRate / decimation;
  const frameSize = Math.min(2048, Math.floor(source.length / decimation));
  if (frameSize < 256) return null;

  const sourceFrameLength = frameSize * decimation;
  const frameCount = Math.min(32, Math.max(1, Math.floor(source.length / sourceFrameLength)));
  const detected = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const availableOffset = Math.max(0, source.length - sourceFrameLength);
    const frameOffset = frameCount === 1
      ? Math.floor(availableOffset / 2)
      : Math.floor((availableOffset * frameIndex) / (frameCount - 1));
    const frame = new Float32Array(frameSize);

    for (let index = 0; index < frameSize; index += 1) {
      frame[index] = readMonoSample(source, frameOffset + index * decimation);
    }

    const frequency = estimateFramePitch(frame, analysisSampleRate);
    if (frequency && Number.isFinite(frequency)) detected.push(frequency);
  }

  if (detected.length === 0) return null;

  const notes = new Map();
  for (const frequency of detected) {
    const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
    if (midi < 0 || midi > 127) continue;
    const entry = notes.get(midi) || { count: 0, frequencies: [] };
    entry.count += 1;
    entry.frequencies.push(frequency);
    notes.set(midi, entry);
  }

  if (notes.size === 0) return null;

  const [midi, result] = [...notes.entries()].sort(
    (first, second) => second[1].count - first[1].count
  )[0];
  result.frequencies.sort((first, second) => first - second);
  const frequency = result.frequencies[Math.floor(result.frequencies.length / 2)];
  const note = NOTE_NAMES[(midi + 120) % 12];
  const octave = Math.floor(midi / 12) - 1;

  return `${note}${octave} (${Math.round(frequency)} Hz)`;
};

const correlationWithProfile = (chroma, profile, root) => {
  const chromaMean = chroma.reduce((sum, value) => sum + value, 0) / chroma.length;
  const profileMean = profile.reduce((sum, value) => sum + value, 0) / profile.length;
  let numerator = 0;
  let chromaEnergy = 0;
  let profileEnergy = 0;

  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    const chromaValue = chroma[pitchClass] - chromaMean;
    const profileValue = profile[(pitchClass - root + 12) % 12] - profileMean;
    numerator += chromaValue * profileValue;
    chromaEnergy += chromaValue * chromaValue;
    profileEnergy += profileValue * profileValue;
  }

  const denominator = Math.sqrt(chromaEnergy * profileEnergy);
  return denominator ? numerator / denominator : -Infinity;
};

const estimateKey = (source) => {
  const maximumFrameSize = 4096;
  const availablePower = Math.floor(Math.log2(source.length));
  const frameSize = Math.min(maximumFrameSize, 2 ** availablePower);
  if (frameSize < 512) return null;

  const frameCount = Math.min(48, Math.max(1, Math.floor(source.length / frameSize)));
  const chroma = new Array(12).fill(0);
  let totalWeight = 0;

  Meyda.bufferSize = frameSize;
  Meyda.sampleRate = source.sampleRate;
  Meyda.chromaFilterBank = undefined;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const availableOffset = Math.max(0, source.length - frameSize);
    const frameOffset = frameCount === 1
      ? Math.floor(availableOffset / 2)
      : Math.floor((availableOffset * frameIndex) / (frameCount - 1));
    const frame = new Float32Array(frameSize);

    for (let index = 0; index < frameSize; index += 1) {
      frame[index] = readMonoSample(source, frameOffset + index);
    }

    const features = Meyda.extract(["chroma", "rms"], frame);
    if (!features?.chroma || !features.rms || features.rms < 0.001) continue;

    for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
      chroma[pitchClass] += features.chroma[pitchClass] * features.rms;
    }
    totalWeight += features.rms;
  }

  if (!totalWeight) return null;
  for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
    chroma[pitchClass] /= totalWeight;
  }

  let best = { score: -Infinity, root: 0, mode: "major" };
  for (let root = 0; root < 12; root += 1) {
    const majorScore = correlationWithProfile(chroma, MAJOR_PROFILE, root);
    const minorScore = correlationWithProfile(chroma, MINOR_PROFILE, root);
    if (majorScore > best.score) best = { score: majorScore, root, mode: "major" };
    if (minorScore > best.score) best = { score: minorScore, root, mode: "minor" };
  }

  return Number.isFinite(best.score) ? `${NOTE_NAMES[best.root]} ${best.mode}` : null;
};

export const analyseRegion = (audioBuffer, startSeconds, endSeconds) => {
  const source = createRegionSource(audioBuffer, startSeconds, endSeconds);
  const duration = Math.max(0, Math.abs(endSeconds - startSeconds));

  if (!source) return { duration, bpm: null, pitch: null, key: null };
  if (regionRms(source) < 0.0001) {
    return { duration: source.duration, bpm: null, pitch: null, key: null };
  }

  return {
    duration: source.duration,
    bpm: estimateBpm(source),
    pitch: estimatePitch(source),
    key: estimateKey(source)
  };
};
