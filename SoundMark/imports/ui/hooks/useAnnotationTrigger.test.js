import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import { useAnnotationTrigger } from "./useAnnotationTrigger";

if (Meteor.isClient) {
  describe("useAnnotationTrigger", function () {
    it("initializes with undefined trigger state", function () {
      const { result } = renderHook(() => useAnnotationTrigger());
      assert.isUndefined(result.current.trigger);
    });

    it("sets trigger timestamps when opening a valid region", function () {
      const { result } = renderHook(() => useAnnotationTrigger());

      act(() => {
        result.current.openAnnotation({ startMs: 1000, endMs: 5000 });
      });

      assert.deepEqual(result.current.trigger, {
        startMs: 1000,
        endMs: 5000
      });
    });

    it("resets trigger to null if openAnnotation receives null", function () {
      const { result } = renderHook(() => useAnnotationTrigger());

      act(() => {
        result.current.openAnnotation({ startMs: 1000, endMs: 5000 });
        result.current.openAnnotation(null);
      });

      assert.isNull(result.current.trigger);
    });

    it("resets trigger to undefined when calling closeAnnotation", function () {
      const { result } = renderHook(() => useAnnotationTrigger());

      act(() => {
        result.current.openAnnotation({ startMs: 1000, endMs: 5000 });
        result.current.closeAnnotation();
      });

      assert.isUndefined(result.current.trigger);
    });
  });
}
