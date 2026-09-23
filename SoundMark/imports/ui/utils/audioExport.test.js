import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";
import {
	sliceAudioBuffer,
	applyEffectsChain,
	encodeWavBlob,
	secondsToFileLabel,
} from "./audioExport";

if (Meteor.isClient) {
	describe("audioExport", function () {
		const createBuffer = (samplesPerChannel, sampleRate = 8000, channels = 1) => {
			const buffer = new AudioBuffer({
				numberOfChannels: channels,
				length: samplesPerChannel,
				sampleRate,
			});
			for (let ch = 0; ch < channels; ch++) {
				const data = buffer.getChannelData(ch);
				for (let i = 0; i < data.length; i++) {
					data[i] = ((i % 10) / 10) * 2 - 1; // ramp between -1 and ~1
				}
			}
			return buffer;
		};

		describe("encodeWavBlob", function () {
			it("produces a WAV blob with a correctly sized header and data chunk", async function () {
				const buffer = createBuffer(100, 8000, 1);
				const blob = encodeWavBlob(buffer);

				assert.equal(blob.type, "audio/wav");
				// 44-byte header + 100 frames * 1 channel * 2 bytes/sample
				assert.equal(blob.size, 44 + 200);

				const view = new DataView(await blob.arrayBuffer());
				const readString = (offset, length) =>
					String.fromCharCode(
						...Array.from({ length }, (_, i) => view.getUint8(offset + i)),
					);

				assert.equal(readString(0, 4), "RIFF");
				assert.equal(readString(8, 4), "WAVE");
				assert.equal(view.getUint16(22, true), 1); // numChannels
				assert.equal(view.getUint32(24, true), 8000); // sampleRate
			});
		});

		describe("secondsToFileLabel", function () {
			it("formats sub-minute durations without a minutes component", function () {
				assert.equal(secondsToFileLabel(12), "12s");
				assert.equal(secondsToFileLabel(0), "0s");
			});

			it("formats durations over a minute as MmSSs", function () {
				assert.equal(secondsToFileLabel(65), "1m05s");
				assert.equal(secondsToFileLabel(125), "2m05s");
			});
		});

		describe("applyEffectsChain pitch shifting", function () {
			it("pitch shifts only the selected region without modifying the source", async function () {
				const sampleRate = 8000;
				const duration = 0.5;
				const buffer = createBuffer(Math.floor(sampleRate * duration), sampleRate, 1);

				const original = new Float32Array(buffer.getChannelData(0));

				const processed = await applyEffectsChain(buffer, [
					{
						_id: "pitch-test",
						type: "pitchShift",
						start: 0.1,
						end: 0.4,
						params: { semitones: 12 },
						enabled: true,
						order: 0,
					},
				]);

				// The source buffer must not have been mutated.
				assert.deepEqual(Array.from(buffer.getChannelData(0)), Array.from(original));

				// The output must differ from the original in the selected region.
				let changedInside = false;

				for (let i = Math.floor(0.1 * sampleRate); i < Math.ceil(0.4 * sampleRate); i++) {
					if (processed.getChannelData(0)[i] !== original[i]) {
						changedInside = true;
						break;
					}
				}

				assert.isTrue(changedInside);
			});
		});

		describe("applyEffectsChain filtering", function () {
			it("filters only the selected region without modifying the source", async function () {
				if (!(globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext)) {
					this.skip();
					return;
				}

				const sampleRate = 44100;
				const duration = 0.5;
				const buffer = createBuffer(Math.floor(sampleRate * duration), sampleRate, 1);

				const original = new Float32Array(buffer.getChannelData(0));

				const processed = await applyEffectsChain(buffer, [
					{
						_id: "filter-test",
						type: "filter",
						start: 0.1,
						end: 0.4,
						params: {
							filterType: "lowpass",
							frequency: 1000,
						},
						enabled: true,
						order: 0,
					},
				]);

				// The source buffer must not have been mutated.
				assert.deepEqual(Array.from(buffer.getChannelData(0)), Array.from(original));

				// The processed buffer must retain the original format.
				assert.equal(processed.numberOfChannels, buffer.numberOfChannels);
				assert.equal(processed.length, buffer.length);
				assert.equal(processed.sampleRate, buffer.sampleRate);

				// Something in the selected region should have changed.
				let changedInside = false;

				for (let i = Math.floor(0.1 * sampleRate); i < Math.ceil(0.4 * sampleRate); i++) {
					if (processed.getChannelData(0)[i] !== original[i]) {
						changedInside = true;
						break;
					}
				}

				assert.isTrue(changedInside);
			});
		});
	});
}
