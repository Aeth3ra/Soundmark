import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useAnnotationAnalysis } from "./useAnnotationAnalysis";

if (Meteor.isClient) {
  describe("useAnnotationAnalysis", function () {
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
    });

    it("analyses saved regions only after the sidebar is enabled", function () {
      const samples = new Float32Array(22050);
      const decodedAudio = {
        duration: 2,
        length: samples.length,
        numberOfChannels: 1,
        sampleRate: 11025,
        getChannelData: () => samples
      };
      const wavesurfer = { getDecodedData: () => decodedAudio };
      const annotations = [{ _id: "one", start: 0, end: 2 }];
      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useAnnotationAnalysis(wavesurfer, annotations, enabled),
        { initialProps: { enabled: false } }
      );

      assert.deepEqual(result.current, {});

      rerender({ enabled: true });
      assert.isTrue(result.current.one.isAnalysing);

      act(() => clock.runAll());

      assert.deepInclude(result.current.one, {
        duration: 2,
        bpm: null,
        pitch: null,
        key: null,
        isAnalysing: false
      });
    });

    it("returns unavailable values for timestamp annotations", function () {
      const wavesurfer = { getDecodedData: sinon.stub() };
      const annotations = [{ _id: "timestamp", start: 1, end: null }];
      const { result } = renderHook(() =>
        useAnnotationAnalysis(wavesurfer, annotations, true)
      );

      assert.deepEqual(result.current.timestamp, {
        duration: null,
        bpm: null,
        pitch: null,
        key: null,
        isAnalysing: false
      });
    });
  });
}
