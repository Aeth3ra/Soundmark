import React from "react";
import { Meteor } from "meteor/meteor";
import { render, act } from "@testing-library/react";
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

    beforeEach(function () {
      eventListeners = {};
      mediaElementMock = { loop: false };

      mockWavesurferInstance = {
        load: sinon.stub(),
        destroy: sinon.stub(),
        on: sinon.stub().callsFake((event, callback) => {
          eventListeners[event] = callback;
        }),
        play: sinon.stub(),
        pause: sinon.stub(),
        playPause: sinon.stub(),
        setVolume: sinon.stub(),
        zoom: sinon.stub(),
        seekTo: sinon.stub(),
        setPlaybackRate: sinon.stub(),
        getDuration: sinon.stub().returns(120),
        getCurrentTime: sinon.stub().returns(15),
        getMediaElement: sinon.stub().returns(mediaElementMock)
      };

      createStub = sinon
        .stub(WaveSurfer, "create")
        .returns(mockWavesurferInstance);
    });

    afterEach(function () {
      sinon.restore();
    });

    it("initializes WaveSurfer instance when container ref and URL exist", function () {
      let hookResult;
      function WrapperComponent({ url }) {
        hookResult = useWavesurfer(url);
        return <div ref={hookResult.containerRef} />;
      }

      render(<WrapperComponent url="https://example.com/audio.mp3" />);

      assert.isTrue(createStub.calledOnce);
      assert.isTrue(
        mockWavesurferInstance.load.calledWith("https://example.com/audio.mp3")
      );
    });

    it("executes control actions on the underlying WaveSurfer instance", function () {
      let hookResult;
      function WrapperComponent({ url }) {
        hookResult = useWavesurfer(url);
        return <div ref={hookResult.containerRef} />;
      }

      render(<WrapperComponent url="https://example.com/audio.mp3" />);

      act(() => {
        hookResult.play();
        hookResult.pause();
        hookResult.playPause();
        hookResult.setVolume(0.8);
        hookResult.setZoom(50);
        hookResult.seekTo(0.5);
        hookResult.setPlaybackRate(1.5);
        hookResult.toggleLoop();
      });

      assert.isTrue(mockWavesurferInstance.play.calledOnce);
      assert.isTrue(mockWavesurferInstance.pause.calledOnce);
      assert.isTrue(mockWavesurferInstance.playPause.calledOnce);
      assert.isTrue(mockWavesurferInstance.setVolume.calledWith(0.8));
      assert.isTrue(mockWavesurferInstance.zoom.calledWith(50));
      assert.isTrue(mockWavesurferInstance.seekTo.calledWith(0.5));
      assert.isTrue(
        mockWavesurferInstance.setPlaybackRate.calledWith(1.5, true)
      );
      assert.strictEqual(hookResult.playbackRate, 1.5);
      assert.isTrue(hookResult.isLooping);
      assert.isTrue(mediaElementMock.loop);
    });

    it("updates state based on WaveSurfer event listeners", function () {
      let hookResult;
      function WrapperComponent({ url }) {
        hookResult = useWavesurfer(url);
        return <div ref={hookResult.containerRef} />;
      }

      render(<WrapperComponent url="https://example.com/audio.mp3" />);

      // Test 'ready' event
      act(() => {
        if (eventListeners["ready"]) eventListeners["ready"]();
      });
      assert.strictEqual(hookResult.duration, 120);
      assert.strictEqual(hookResult.wavesurferInstance, mockWavesurferInstance);

      // Test 'play', 'pause', and 'finish' events
      act(() => {
        if (eventListeners["play"]) eventListeners["play"]();
      });
      assert.isTrue(hookResult.isPlaying);

      act(() => {
        if (eventListeners["pause"]) eventListeners["pause"]();
      });
      assert.isFalse(hookResult.isPlaying);

      act(() => {
        if (eventListeners["finish"]) eventListeners["finish"]();
      });
      assert.isFalse(hookResult.isPlaying);

      // Test 'audioprocess' and 'seeking' events
      act(() => {
        if (eventListeners["audioprocess"]) eventListeners["audioprocess"]();
      });
      assert.strictEqual(hookResult.currentTime, 15);

      mockWavesurferInstance.getCurrentTime.returns(45);
      act(() => {
        if (eventListeners["seeking"]) eventListeners["seeking"]();
      });
      assert.strictEqual(hookResult.currentTime, 45);

      // Test 'zoom' event
      act(() => {
        if (eventListeners["zoom"]) eventListeners["zoom"](100);
      });
      assert.strictEqual(hookResult.zoom, 100);
    });

    it("destroys WaveSurfer instance on unmount", function () {
      let hookResult;
      function WrapperComponent({ url }) {
        hookResult = useWavesurfer(url);
        return <div ref={hookResult.containerRef} />;
      }

      const { unmount } = render(
        <WrapperComponent url="https://example.com/audio.mp3" />
      );

      unmount();

      assert.isTrue(mockWavesurferInstance.destroy.calledOnce);
    });
  });
}
