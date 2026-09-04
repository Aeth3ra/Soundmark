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

    beforeEach(function () {
      mediaElementMock = { loop: false };
      mockWavesurferInstance = {
        load: sinon.stub(),
        destroy: sinon.stub(),
        on: sinon.stub(),
        playPause: sinon.stub(),
        setVolume: sinon.stub(),
        zoom: sinon.stub(),
        setPlaybackRate: sinon.stub(),
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
      function TestComponent() {
        useWavesurfer("https://example.com/audio.mp3");
        return <div ref={(node) => {}} />;
      }

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
        hookResult.playPause();
        hookResult.setVolume(0.8);
        hookResult.setPlaybackRate(1.5);
        hookResult.toggleLoop();
      });

      assert.isTrue(mockWavesurferInstance.playPause.calledOnce);
      assert.isTrue(mockWavesurferInstance.setVolume.calledWith(0.8));
      assert.isTrue(
        mockWavesurferInstance.setPlaybackRate.calledWith(1.5, true)
      );
      assert.isTrue(hookResult.isLooping);
    });
  });
}
