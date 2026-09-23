import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import { applyEffectsChain } from "./audioEffects";

if (Meteor.isClient) {
    describe("audioEffects", function () {
        const createBuffer = (
            samplesPerChannel,
            sampleRate = 8000,
            channels = 1
        ) => {
            const buffer = new AudioBuffer({
                numberOfChannels: channels,
                length: samplesPerChannel,
                sampleRate
            });
            for (let ch = 0; ch < channels; ch++) {
                const data = buffer.getChannelData(ch);
                for (let i = 0; i < data.length; i++) {
                    data[i] = ((i % 10) / 10) * 2 - 1; // ramp between -1 and ~1
                }
            }
            return buffer;
        };

        const baseEffect = (overrides) => ({
            _id: "effect-1",
            enabled: true,
            order: 0,
            start: 0.1,
            end: 0.4,
            ...overrides
        });

        const hasOfflineAudioContext = () =>
            Boolean(
                globalThis.OfflineAudioContext ||
                globalThis.webkitOfflineAudioContext
            );

        describe("input validation", function () {
            it("returns the original buffer untouched when there are no active effects", async function () {
                const buffer = createBuffer(4000, 8000, 1);
                const result = await applyEffectsChain(buffer, []);
                assert.strictEqual(result, buffer);
            });

            it("skips disabled effects", async function () {
                const buffer = createBuffer(4000, 8000, 1);
                const original = Array.from(buffer.getChannelData(0));
                const result = await applyEffectsChain(buffer, [
                    baseEffect({
                        type: "amplify",
                        enabled: false,
                        params: { gain: 2 }
                    })
                ]);
                assert.deepEqual(
                    Array.from(result.getChannelData(0)),
                    original
                );
            });

            it("throws if effects is not an array", async function () {
                const buffer = createBuffer(10, 8000, 1);
                try {
                    await applyEffectsChain(buffer, "not-an-array");
                    assert.fail("expected an error");
                } catch (error) {
                    assert.equal(error.message, "Effects must be an array.");
                }
            });

            it("throws for an effect missing required bookkeeping fields", async function () {
                const buffer = createBuffer(10, 8000, 1);
                try {
                    await applyEffectsChain(buffer, [
                        { type: "amplify", enabled: true }
                    ]);
                    assert.fail("expected an error");
                } catch (error) {
                    assert.equal(error.message, "Invalid effect settings.");
                }
            });

            it("throws for an unimplemented effect type", async function () {
                const buffer = createBuffer(10, 8000, 1);
                try {
                    await applyEffectsChain(buffer, [
                        baseEffect({ type: "reverb", params: {} })
                    ]);
                    assert.fail("expected an error");
                } catch (error) {
                    assert.equal(
                        error.message,
                        "Rendering reverb effects is not implemented yet."
                    );
                }
            });

            it("throws when an effect's region falls outside the audio", async function () {
                const buffer = createBuffer(80, 8000, 1); // 0.01s long
                try {
                    await applyEffectsChain(buffer, [
                        baseEffect({
                            type: "amplify",
                            start: 0,
                            end: 999,
                            params: { gain: 1 }
                        })
                    ]);
                    assert.fail("expected an error");
                } catch (error) {
                    assert.equal(
                        error.message,
                        "An effect is outside the audio duration."
                    );
                }
            });
        });

        describe("applyEffectsChain pitch shifting", function () {
            it("pitch shifts only the selected region without modifying the source", async function () {
                const sampleRate = 8000;
                const duration = 0.5;
                const buffer = createBuffer(
                    Math.floor(sampleRate * duration),
                    sampleRate,
                    1
                );
                const original = new Float32Array(buffer.getChannelData(0));

                const processed = await applyEffectsChain(buffer, [
                    baseEffect({
                        type: "pitchShift",
                        start: 0.1,
                        end: 0.4,
                        params: { semitones: 12 }
                    })
                ]);

                // The source buffer must not have been mutated.
                assert.deepEqual(
                    Array.from(buffer.getChannelData(0)),
                    Array.from(original)
                );

                // The output must differ from the original in the selected region.
                let changedInside = false;
                for (
                    let i = Math.floor(0.1 * sampleRate);
                    i < Math.ceil(0.4 * sampleRate);
                    i++
                ) {
                    if (processed.getChannelData(0)[i] !== original[i]) {
                        changedInside = true;
                        break;
                    }
                }
                assert.isTrue(changedInside);
            });

            it("rejects a semitone value outside +/-24", async function () {
                const buffer = createBuffer(4000, 8000, 1);
                try {
                    await applyEffectsChain(buffer, [
                        baseEffect({
                            type: "pitchShift",
                            params: { semitones: 30 }
                        })
                    ]);
                    assert.fail("expected an error");
                } catch (error) {
                    assert.match(error.message, /-24 and 24 semitones/);
                }
            });
        });

        describe("applyEffectsChain filtering", function () {
            it("filters only the selected region without modifying the source", async function () {
                if (!hasOfflineAudioContext()) {
                    this.skip();
                    return;
                }

                const sampleRate = 44100;
                const duration = 0.5;
                const buffer = createBuffer(
                    Math.floor(sampleRate * duration),
                    sampleRate,
                    1
                );
                const original = new Float32Array(buffer.getChannelData(0));

                const processed = await applyEffectsChain(buffer, [
                    baseEffect({
                        type: "filter",
                        start: 0.1,
                        end: 0.4,
                        params: { filterType: "lowpass", frequency: 1000 }
                    })
                ]);

                // The source buffer must not have been mutated.
                assert.deepEqual(
                    Array.from(buffer.getChannelData(0)),
                    Array.from(original)
                );

                // The processed buffer must retain the original format.
                assert.equal(
                    processed.numberOfChannels,
                    buffer.numberOfChannels
                );
                assert.equal(processed.length, buffer.length);
                assert.equal(processed.sampleRate, buffer.sampleRate);

                // Something in the selected region should have changed.
                let changedInside = false;
                for (
                    let i = Math.floor(0.1 * sampleRate);
                    i < Math.ceil(0.4 * sampleRate);
                    i++
                ) {
                    if (processed.getChannelData(0)[i] !== original[i]) {
                        changedInside = true;
                        break;
                    }
                }
                assert.isTrue(changedInside);
            });

            it("rejects a cutoff frequency at or above Nyquist", async function () {
                const buffer = createBuffer(4000, 8000, 1); // Nyquist = 4000Hz
                try {
                    await applyEffectsChain(buffer, [
                        baseEffect({
                            type: "filter",
                            params: { filterType: "lowpass", frequency: 4000 }
                        })
                    ]);
                    assert.fail("expected an error");
                } catch (error) {
                    assert.match(error.message, /below 4000 Hz/);
                }
            });
        });

        describe("applyEffectsChain amplify", function () {
            it("raises the gain of the selected region", async function () {
                if (!hasOfflineAudioContext()) {
                    this.skip();
                    return;
                }
                const sampleRate = 8000;
                const buffer = createBuffer(
                    Math.floor(sampleRate * 0.5),
                    sampleRate,
                    1
                );
                for (let i = 0; i < buffer.length; i++)
                    buffer.getChannelData(0)[i] = 0.1;

                const processed = await applyEffectsChain(buffer, [
                    baseEffect({
                        type: "amplify",
                        start: 0.1,
                        end: 0.2,
                        params: { gain: 2 }
                    })
                ]);

                const sampleIndex = Math.floor(0.15 * sampleRate); // inside the region
                assert.approximately(
                    processed.getChannelData(0)[sampleIndex],
                    0.2,
                    0.02
                );
            });

            it("rejects a gain that would clip the region", async function () {
                const buffer = createBuffer(4000, 8000, 1);
                for (let i = 0; i < buffer.length; i++)
                    buffer.getChannelData(0)[i] = 0.9;
                try {
                    await applyEffectsChain(buffer, [
                        baseEffect({ type: "amplify", params: { gain: 4 } })
                    ]);
                    assert.fail("expected an error");
                } catch (error) {
                    assert.match(error.message, /would clip/);
                }
            });

            it("rejects a gain outside 0-4", async function () {
                const buffer = createBuffer(4000, 8000, 1);
                try {
                    await applyEffectsChain(buffer, [
                        baseEffect({ type: "amplify", params: { gain: 10 } })
                    ]);
                    assert.fail("expected an error");
                } catch (error) {
                    assert.match(
                        error.message,
                        /Invalid amplification settings/
                    );
                }
            });
        });

        describe("applyEffectsChain normalize", function () {
            it("rejects a target RMS outside (0, 1]", async function () {
                const buffer = createBuffer(4000, 8000, 1);
                try {
                    await applyEffectsChain(buffer, [
                        baseEffect({
                            type: "normalize",
                            params: { mode: "rms", targetRms: 1.5 }
                        })
                    ]);
                    assert.fail("expected an error");
                } catch (error) {
                    assert.match(
                        error.message,
                        /Invalid normalisation settings/
                    );
                }
            });

            it("rejects a mode other than 'rms'", async function () {
                const buffer = createBuffer(4000, 8000, 1);
                try {
                    await applyEffectsChain(buffer, [
                        baseEffect({
                            type: "normalize",
                            params: { mode: "peak", targetRms: 0.5 }
                        })
                    ]);
                    assert.fail("expected an error");
                } catch (error) {
                    assert.match(
                        error.message,
                        /Invalid normalisation settings/
                    );
                }
            });
        });
    });
}
