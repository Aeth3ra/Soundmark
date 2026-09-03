import { Meteor } from "meteor/meteor";
import { renderHook } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useAnnotationRender } from "./useAnnotationRender";

if (Meteor.isClient) {
  describe("useAnnotationRender", function () {
    let mockRegionsPlugin;
    let fakeRegion;

    beforeEach(function () {
      fakeRegion = {
        remove: sinon.stub(),
        setOptions: sinon.stub(),
        element: {}
      };

      mockRegionsPlugin = {
        addRegion: sinon.stub().returns(fakeRegion)
      };
    });

    it("creates new regions for provided annotations", function () {
      const annotations = [
        { _id: "ann-1", start: 1, end: 5, colour: "#ff0000" }
      ];

      const { result } = renderHook(() =>
        useAnnotationRender(mockRegionsPlugin, annotations)
      );

      assert.isTrue(mockRegionsPlugin.addRegion.calledOnce);
      assert.equal(result.current.length, 1);
      assert.equal(result.current[0].id, "ann-1");
    });

    it("removes region if annotation is deleted from props", function () {
      const annotations = [
        { _id: "ann-1", start: 1, end: 5, colour: "#ff0000" }
      ];

      const { rerender } = renderHook(
        ({ plugin, list }) => useAnnotationRender(plugin, list),
        { initialProps: { plugin: mockRegionsPlugin, list: annotations } }
      );

      // Pass empty list to simulate Mongo deletion
      rerender({ plugin: mockRegionsPlugin, list: [] });

      assert.isTrue(fakeRegion.remove.calledOnce);
    });

    it("clears all drawn regions on component unmount", function () {
      const annotations = [
        { _id: "ann-1", start: 1, end: 5, colour: "#ff0000" }
      ];

      const { unmount } = renderHook(() =>
        useAnnotationRender(mockRegionsPlugin, annotations)
      );

      unmount();

      assert.isTrue(fakeRegion.remove.calledOnce);
    });
  });
}
