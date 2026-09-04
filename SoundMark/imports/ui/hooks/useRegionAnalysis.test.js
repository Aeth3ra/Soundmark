import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useRegionAnalysis } from "./useRegionAnalysis";

if (Meteor.isClient) {
  describe("useRegionAnalysis", function () {
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
    });

    afterEach(function () {
      clock.restore();
    });

    it("returns default empty state when activeRegion is missing", function () {
      const { result } = renderHook(() => useRegionAnalysis(null, null));

      assert.deepEqual(result.current, {
        duration: null,
        bpm: null,
        pitch: null,
        key: null,
        isAnalysing: false
      });
    });

    it("computes duration and sets isAnalysing when decodedAudio exists", function () {
      const fakeAudioData = {};
      const fakeWavesurfer = {
        getDecodedData: () => fakeAudioData
      };
      const fakeRegion = { start: 2.0, end: 10.0 };

      const { result } = renderHook(() =>
        useRegionAnalysis(fakeWavesurfer, fakeRegion)
      );

      assert.equal(result.current.duration, 8.0);
      assert.isTrue(result.current.isAnalysing);

      act(() => {
        clock.tick(1);
      });

      assert.isFalse(result.current.isAnalysing);
    });
  });
}
