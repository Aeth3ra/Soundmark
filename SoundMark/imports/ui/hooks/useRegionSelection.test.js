import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useRegionSelection } from "./useRegionSelection";

if (Meteor.isClient) {
  describe("useRegionSelection", function () {
    it("enables drag selection and listens for region events", function () {
      const listeners = {};
      const fakeRegion1 = {
        id: "selection-1",
        start: 0,
        end: 5,
        remove: sinon.stub()
      };

      const fakePlugin = {
        enableDragSelection: sinon.stub(),
        getRegions: sinon.stub().returns([fakeRegion1]),
        on: sinon.stub().callsFake((event, cb) => {
          listeners[event] = cb;
        }),
        un: sinon.stub()
      };

      const { result } = renderHook(() => useRegionSelection(fakePlugin));

      assert.isTrue(
        fakePlugin.enableDragSelection.calledOnceWith({
          color: "rgba(135, 135, 221, 0.4)"
        })
      );

      act(() => {
        listeners["region-created"]({
          id: "selection-2",
          start: 1,
          end: 4,
          element: { style: { setProperty: sinon.stub() } }
        });
      });

      assert.deepEqual(result.current.activeRegion, {
        id: "selection-2",
        start: 1,
        end: 4
      });
      assert.isTrue(fakeRegion1.remove.calledOnce);

      act(() => {
        result.current.clearRegion();
      });

      assert.isNull(result.current.activeRegion);
    });
  });
}
