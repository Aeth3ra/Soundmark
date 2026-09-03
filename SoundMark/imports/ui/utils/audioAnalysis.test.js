import { assert } from "chai";
import { analyseRegion } from "./audioAnalysis";

const createAudioBuffer = (samples, sampleRate) => ({
  duration: samples.length / sampleRate,
  length: samples.length,
  numberOfChannels: 1,
  sampleRate,
  getChannelData: () => samples
});

const createTone = (frequency, duration, sampleRate = 11025) => {
  const samples = new Float32Array(duration * sampleRate);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] =
      0.5 * Math.sin((2 * Math.PI * frequency * index) / sampleRate);
  }
  return createAudioBuffer(samples, sampleRate);
};

const createClickTrack = (bpm, duration, sampleRate = 11025) => {
  const samples = new Float32Array(duration * sampleRate);
  const samplesPerBeat = Math.round((sampleRate * 60) / bpm);
  const clickLength = Math.round(sampleRate * 0.02);

  for (let beat = 0; beat < samples.length; beat += samplesPerBeat) {
    for (
      let offset = 0;
      offset < clickLength && beat + offset < samples.length;
      offset += 1
    ) {
      const decay = 1 - offset / clickLength;
      samples[beat + offset] =
        decay * Math.sin((2 * Math.PI * 1000 * offset) / sampleRate);
    }
  }

  return createAudioBuffer(samples, sampleRate);
};

const createChord = (frequencies, duration, sampleRate = 11025) => {
  const samples = new Float32Array(duration * sampleRate);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = frequencies.reduce(
      (sum, frequency) =>
        sum + 0.2 * Math.sin((2 * Math.PI * frequency * index) / sampleRate),
      0
    );
  }
  return createAudioBuffer(samples, sampleRate);
};

describe("audioAnalysis", function () {
  it("analyses duration and pitch for a selected region", function () {
    const result = analyseRegion(createTone(440, 3), 0.5, 2.5);

    assert.strictEqual(result.duration, 2);
    assert.match(result.pitch, /^A4 \(440 Hz\)$/);
  });

  it("estimates BPM from a selected click track", function () {
    const result = analyseRegion(createClickTrack(120, 8), 0, 8);

    assert.ok(Math.abs(result.bpm - 120) <= 2);
  });

  it("estimates key from a selected chord", function () {
    const cMajor = createChord([261.63, 329.63, 392], 3);
    const result = analyseRegion(cMajor, 0, 3);

    assert.strictEqual(result.key, "C major");
  });

  it("returns empty musical values for silence", function () {
    const silence = createAudioBuffer(new Float32Array(22050), 11025);
    const result = analyseRegion(silence, 0, 2);

    assert.deepStrictEqual(result, {
      duration: 2,
      bpm: null,
      pitch: null,
      key: null
    });
  });
});
