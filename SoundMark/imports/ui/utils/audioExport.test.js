import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import {
    sliceAudioBuffer,
    encodeWavBlob,
    secondsToFileLabel,
    cloneAudioBuffer,
    spliceAudioBuffer
} from "./audioExport";

if (Meteor.isClient) {
    describe("audioExport", function () {
        const createBuffer = (
            samplesPerChannel,
            sampleRate = 8000,
            channels = 1,
            sampleGenerator
        ) => {
            const buffer = new AudioBuffer({
                numberOfChannels: channels,
                length: samplesPerChannel,
                sampleRate
            });
            for (let ch = 0; ch < channels; ch++) {
                const data = buffer.getChannelData(ch);
                for (let i = 0; i < data.length; i++) {
                    data[i] = sampleGenerator
                        ? sampleGenerator(i, ch)
                        : ((i % 10) / 10) * 2 - 1;
                }
            }
            return buffer;
        };

        describe("sliceAudioBuffer", function () {
            it("copies only the samples within the requested range", function () {
                const buffer = createBuffer(8000, 8000, 1); // 1s @ 8000Hz (was 100, 100)[cite: 2]
                const sliced = sliceAudioBuffer(buffer, 0.2, 0.5);

                assert.equal(sliced.length, 2400); // 0.3s * 8000
                assert.equal(sliced.numberOfChannels, 1);
                assert.equal(sliced.sampleRate, 8000);
                assert.deepEqual(
                    Array.from(sliced.getChannelData(0)),
                    Array.from(buffer.getChannelData(0).subarray(1600, 4000))
                );
            });

            it("preserves every channel independently", function () {
                const buffer = createBuffer(8000, 8000, 2); // 8000Hz[cite: 2]
                const sliced = sliceAudioBuffer(buffer, 0, 0.1);

                assert.equal(sliced.numberOfChannels, 2);
                assert.deepEqual(
                    Array.from(sliced.getChannelData(1)),
                    Array.from(buffer.getChannelData(1).subarray(0, 800))
                );
            });

            it("clamps the requested range to the buffer's duration", function () {
                const buffer = createBuffer(8000, 8000, 1); // 8000Hz[cite: 2]
                const sliced = sliceAudioBuffer(buffer, -5, 5);

                assert.equal(sliced.length, 8000);
                assert.deepEqual(
                    Array.from(sliced.getChannelData(0)),
                    Array.from(buffer.getChannelData(0))
                );
            });

            it("tolerates a reversed start/end pair", function () {
                const buffer = createBuffer(8000, 8000, 1); // 8000Hz[cite: 2]
                const sliced = sliceAudioBuffer(buffer, 0.5, 0.2);

                assert.equal(sliced.length, 2400);
                assert.deepEqual(
                    Array.from(sliced.getChannelData(0)),
                    Array.from(buffer.getChannelData(0).subarray(1600, 4000))
                );
            });

            it("throws when the requested region is empty", function () {
                const buffer = createBuffer(8000, 8000, 1); // 8000Hz[cite: 2]
                assert.throws(
                    () => sliceAudioBuffer(buffer, 0.5, 0.5),
                    "Selected region is empty."
                );
            });

            it("does not mutate the source buffer", function () {
                const buffer = createBuffer(8000, 8000, 1); // 8000Hz[cite: 2]
                const original = Array.from(buffer.getChannelData(0));
                sliceAudioBuffer(buffer, 0.2, 0.5).getChannelData(0).fill(0);

                assert.deepEqual(
                    Array.from(buffer.getChannelData(0)),
                    original
                );
            });
        });

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
                        ...Array.from({ length }, (_, i) =>
                            view.getUint8(offset + i)
                        )
                    );

                assert.equal(readString(0, 4), "RIFF");
                assert.equal(readString(8, 4), "WAVE");
                assert.equal(view.getUint16(22, true), 1); // numChannels
                assert.equal(view.getUint32(24, true), 8000); // sampleRate
            });

            it("sizes the data chunk correctly for multi-channel audio", async function () {
                const buffer = createBuffer(10, 8000, 2);
                const blob = encodeWavBlob(buffer);

                assert.equal(blob.size, 44 + 10 * 2 * 2);

                const view = new DataView(await blob.arrayBuffer());
                assert.equal(view.getUint16(22, true), 2); // numChannels
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

            it("rounds fractional seconds and never goes negative", function () {
                assert.equal(secondsToFileLabel(59.6), "1m00s");
                assert.equal(secondsToFileLabel(-10), "0s");
            });
        });

        describe("cloneAudioBuffer", function () {
            it("returns a new buffer with the same format and data", function () {
                const source = createBuffer(50, 8000, 2, (i) => i / 50);
                const clone = cloneAudioBuffer(source);

                assert.notStrictEqual(clone, source);
                assert.equal(clone.numberOfChannels, source.numberOfChannels);
                assert.equal(clone.length, source.length);
                assert.equal(clone.sampleRate, source.sampleRate);
                assert.deepEqual(
                    Array.from(clone.getChannelData(0)),
                    Array.from(source.getChannelData(0))
                );
                assert.deepEqual(
                    Array.from(clone.getChannelData(1)),
                    Array.from(source.getChannelData(1))
                );
            });

            it("is independent from the source buffer", function () {
                const source = createBuffer(10, 8000, 1, () => 0);
                const clone = cloneAudioBuffer(source);
                clone.getChannelData(0)[0] = 0.987;

                assert.notEqual(source.getChannelData(0)[0], 0.987);
            });
        });

        describe("spliceAudioBuffer", function () {
            it("writes the source samples into the target at the given offset", function () {
                // Pass channels (1) explicitly as 3rd argument so sampleGenerator is 4th
                const target = createBuffer(8000, 8000, 1, () => 0);
                const source = createBuffer(3200, 8000, 1, () => 1);

                spliceAudioBuffer(target, source, 0.3); // offset = 2400 samples (0.3 * 8000)

                // Verify target array from index 2400 to 5600 has the source values (1)
                assert.deepEqual(
                    Array.from(target.getChannelData(0).subarray(2400, 5600)),
                    new Array(3200).fill(1)
                );
            });

            it("mutates the target buffer in place and leaves the source untouched", function () {
                const target = createBuffer(8000, 8000, 1, () => 0);
                const source = createBuffer(3200, 8000, 1, () => 1);
                const sourceCopy = Array.from(source.getChannelData(0));

                spliceAudioBuffer(target, source, 0);

                // Source buffer remains unchanged
                assert.deepEqual(
                    Array.from(source.getChannelData(0)),
                    sourceCopy
                );
                // Target buffer index 0 is mutated to 1 instead of 0
                assert.equal(target.getChannelData(0)[0], 1);
            });

            it("splices every channel independently", function () {
                const target = createBuffer(4800, 8000, 2, () => 0);
                const source = createBuffer(1600, 8000, 2, (i, ch) => ch + 1);

                spliceAudioBuffer(target, source, 0.2); // offset = 1600 samples (0.2 * 8000)

                assert.equal(target.getChannelData(0)[1600], 1);
                assert.equal(target.getChannelData(1)[1600], 2);
            });
        });
    });
}
