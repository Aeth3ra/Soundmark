import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { usePresence } from "./usePresence";
import { PresenceCollection } from "../../api/presences/presenceCollection";

if (Meteor.isClient) {
  describe("usePresence", function () {
    let callAsyncStub;
    let findStub;
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers();
      callAsyncStub = sinon.stub(Meteor, "callAsync").resolves();
      findStub = sinon.stub(PresenceCollection, "find").returns({
        fetch: () => [
          { userId: "user-2", fileId: "file-123", updatedAt: new Date() }
        ]
      });
    });

    afterEach(function () {
      clock.restore();
      sinon.restore();
    });

    it("sends initial presence update upon mounting[cite: 1]", function () {
      renderHook(() =>
        usePresence({
          fileId: "file-123",
          identity: { userId: "user-1" },
          position: 12.5
        })
      );

      assert.isTrue(
        callAsyncStub.calledWith("presence.update", {
          fileId: "file-123",
          position: 12.5
        })
      );
    });

    it("queries PresenceCollection for active participants and formats colors[cite: 1]", function () {
      const { result } = renderHook(() =>
        usePresence({
          fileId: "file-123",
          identity: { userId: "user-1" },
          position: 0
        })
      );

      assert.isTrue(findStub.calledOnce);
      assert.isArray(result.current.others);
      assert.equal(result.current.others.length, 1);
      assert.equal(result.current.others[0].userId, "user-2");
      assert.property(result.current.others[0], "color");
    });

    it("sends heartbeat updates periodically while active[cite: 1]", function () {
      renderHook(() =>
        usePresence({
          fileId: "file-123",
          identity: { userId: "user-1" },
          position: 5.0
        })
      );

      callAsyncStub.resetHistory();

      // Advance clock past 5000ms heartbeat interval
      act(() => {
        clock.tick(5001);
      });

      assert.isTrue(
        callAsyncStub.calledWith("presence.update", {
          fileId: "file-123",
          position: 5.0
        })
      );
    });

    it("sends leave signal on unmount[cite: 1]", function () {
      const { unmount } = renderHook(() =>
        usePresence({
          fileId: "file-123",
          identity: { userId: "user-1" },
          position: 0
        })
      );

      callAsyncStub.resetHistory();
      unmount();

      assert.isTrue(
        callAsyncStub.calledOnceWith("presence.leave", {
          fileId: "file-123"
        })
      );
    });
  });
}
