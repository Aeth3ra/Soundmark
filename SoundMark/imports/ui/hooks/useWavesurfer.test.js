import React from "react";
import { Meteor } from "meteor/meteor";
import { render, act, cleanup } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import WaveSurfer from "wavesurfer.js";
import { useWavesurfer } from "./useWaveSurfer";

if (Meteor.isClient) {
    describe("useWavesurfer", function () {
        let createStub;
        let mockWavesurferInstance;
        let mediaElementMock;
        let eventListeners;
        let loadAudioBufferStub;
        let createPreviewBlobStub;
        let services;
        let fakeBuffer;
        let fakeBlob;
        let currentResult;

        // Wait a full macrotask so the whole promise chain
        // (loadAudioBuffer -> createPreviewBlob -> loadBlob) has finished,
        // regardless of how many microtask ticks it takes.
        const flush = () =>
            act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 0));
            });

        beforeEach(function () {
            eventListeners = {};
            mediaElementMock = { loop: false };
            fakeBuffer = { duration: 42 };
            fakeBlob = new Blob([], { type: "audio/wav" });
            currentResult = null;

            mockWavesurferInstance = {
                on: sinon.stub().callsFake((event, callback) => {
                    eventListeners[event] = callback;
                }),
                once: sinon.stub().returns(sinon.stub()),
                play: sinon.stub().resolves(),
                pause: sinon.stub(),
                loadBlob: sinon.stub().resolves(),
                setTime: sinon.stub(),
                setVolume: sinon.stub(),
                setPlaybackRate: sinon.stub(),
                zoom: sinon.stub(),
                toggleInteraction: sinon.stub(),
                getDuration: sinon.stub().returns(120),
                getCurrentTime: sinon.stub().returns(15),
                getMediaElement: sinon.stub().returns(mediaElementMock),
                destroy: sinon.stub()
            };

            createStub = sinon
                .stub(WaveSurfer, "create")
                .returns(mockWavesurferInstance);

            // ES module exports are frozen, so the stubs are injected through
            // the hook's optional 4th argument instead of patching audioService.
            loadAudioBufferStub = sinon.stub().resolves(fakeBuffer);
            createPreviewBlobStub = sinon.stub().resolves(fakeBlob);
            services = {
                loadAudioBuffer: loadAudioBufferStub,
                createPreviewBlob: createPreviewBlobStub
            };
        });

        afterEach(function () {
            cleanup(); // unmount while the mocks still exist
            sinon.restore();
        });

        function Wrapper({ url, effects = [], effectsReady = true }) {
            const hookResult = useWavesurfer(
                url,
                effects,
                effectsReady,
                services
            );
            currentResult = hookResult;
            return <div ref={hookResult.containerRef} />;
        }

        async function renderHook(props = {}) {
            const utils = render(
                <Wrapper url="https://example.com/audio.mp3" {...props} />
            );
            await flush();
            return utils;
        }

        it("creates a WaveSurfer instance and loads the preview once effects are ready", async function () {
            await renderHook();

            assert.isTrue(createStub.calledOnce);
            assert.isTrue(loadAudioBufferStub.calledOnce);
            assert.isTrue(createPreviewBlobStub.calledWith(fakeBuffer, []));
            assert.isTrue(mockWavesurferInstance.loadBlob.calledWith(fakeBlob));
            assert.isTrue(
                mockWavesurferInstance.toggleInteraction.calledWith(true)
            );

            assert.strictEqual(
                currentResult.wavesurferInstance,
                mockWavesurferInstance
            );
            assert.strictEqual(currentResult.duration, 120);
            assert.isFalse(currentResult.isProcessing);
            assert.isTrue(currentResult.isAudioReady);
        });

        it("stays in a processing state and does not fetch audio until effectsReady is true", async function () {
            await renderHook({ effectsReady: false });

            assert.isFalse(loadAudioBufferStub.called);
            assert.isTrue(currentResult.isProcessing);
            assert.isFalse(currentResult.isAudioReady);
        });

        it("executes control actions on the underlying WaveSurfer instance once ready", async function () {
            await renderHook();

            // The hook itself calls pause() while (re)loading the preview,
            // so clear that history before asserting on user-driven calls.
            mockWavesurferInstance.pause.resetHistory();

            await act(async () => {
                await currentResult.play();
            });
            assert.isTrue(mockWavesurferInstance.play.calledOnce);

            act(() => {
                eventListeners.play();
            });
            assert.isTrue(currentResult.isPlaying);

            act(() => {
                currentResult.pause();
            });
            assert.isTrue(mockWavesurferInstance.pause.calledOnce);
            assert.isFalse(currentResult.isPlaying);

            act(() => {
                currentResult.setVolume(0.8);
            });
            assert.isTrue(mockWavesurferInstance.setVolume.calledWith(0.8));

            act(() => {
                currentResult.setZoom(50);
            });
            assert.isTrue(mockWavesurferInstance.zoom.calledWith(50));
            assert.strictEqual(currentResult.zoom, 50);

            act(() => {
                currentResult.seekTo(0.5);
            });
            // session.duration comes from the decoded source buffer (42s), not wavesurfer.getDuration()
            assert.isTrue(mockWavesurferInstance.setTime.calledWith(21));

            act(() => {
                currentResult.setPlaybackRate(1.5);
            });
            assert.isTrue(
                mockWavesurferInstance.setPlaybackRate.calledWith(1.5, true)
            );
            assert.strictEqual(currentResult.playbackRate, 1.5);

            act(() => {
                currentResult.toggleLoop();
            });
            assert.isTrue(currentResult.isLooping);
            assert.isTrue(mediaElementMock.loop);
        });

        it("updates state from timeupdate, pause, finish, zoom and error events", async function () {
            await renderHook();

            mockWavesurferInstance.getCurrentTime.returns(33);
            act(() => {
                eventListeners.timeupdate();
            });
            assert.strictEqual(currentResult.currentTime, 33);

            act(() => {
                eventListeners.play();
            });
            assert.isTrue(currentResult.isPlaying);

            act(() => {
                eventListeners.pause();
            });
            assert.isFalse(currentResult.isPlaying);

            act(() => {
                eventListeners.play();
            });
            act(() => {
                eventListeners.finish();
            });
            assert.isFalse(currentResult.isPlaying);

            act(() => {
                eventListeners.zoom(75);
            });
            assert.strictEqual(currentResult.zoom, 75);

            act(() => {
                eventListeners.error({ message: "decode failed" });
            });
            assert.isFalse(currentResult.isPlaying);
            assert.strictEqual(currentResult.audioError, "decode failed");
        });

        it("surfaces an error message when play() rejects instead of leaving isPlaying stuck", async function () {
            await renderHook();
            mockWavesurferInstance.play = sinon
                .stub()
                .rejects(new Error("blocked by browser"));

            await act(async () => {
                await currentResult.play();
            });

            assert.isFalse(currentResult.isPlaying);
            assert.match(currentResult.audioError, /blocked by browser/);
        });

        it("reloads the preview with the new effects when the effects array changes", async function () {
            const { rerender } = await renderHook({
                effects: [{ type: "amplify" }]
            });
            createPreviewBlobStub.resetHistory();

            rerender(
                <Wrapper
                    url="https://example.com/audio.mp3"
                    effects={[{ type: "amplify" }, { type: "filter" }]}
                />
            );
            await flush();

            assert.isTrue(
                createPreviewBlobStub.calledWith(fakeBuffer, [
                    { type: "amplify" },
                    { type: "filter" }
                ])
            );
        });

        it("resumes playback at the same position after a local effect toggle", async function () {
            const active = { _id: "effect-1", enabled: true };
            const { rerender } = await renderHook({ effects: [active] });

            await act(async () => {
                await currentResult.play();
            });
            mockWavesurferInstance.play.resetHistory();
            createPreviewBlobStub.resetHistory();

            rerender(
                <Wrapper
                    url="https://example.com/audio.mp3"
                    effects={[{ ...active, enabled: false }]}
                />
            );
            await flush();

            assert.isTrue(
                createPreviewBlobStub.calledWith(fakeBuffer, [
                    { _id: "effect-1", enabled: false }
                ])
            );
            assert.isTrue(mockWavesurferInstance.setTime.calledWith(15));
            assert.isTrue(mockWavesurferInstance.play.calledOnce);
            assert.isTrue(currentResult.isAudioReady);
        });

        it("re-runs the preview pipeline without re-fetching the source on retryAudio", async function () {
            await renderHook();
            loadAudioBufferStub.resetHistory();
            createPreviewBlobStub.resetHistory();

            // Trigger the state change first so the effect re-runs, then let the pipeline finish.
            act(() => {
                currentResult.retryAudio();
            });
            await flush();

            assert.isFalse(loadAudioBufferStub.called);
            assert.isTrue(createPreviewBlobStub.calledOnce);
        });

        it("destroys the WaveSurfer instance on unmount", async function () {
            const { unmount } = await renderHook();
            unmount();
            assert.isTrue(mockWavesurferInstance.destroy.calledOnce);
        });
    });
}
