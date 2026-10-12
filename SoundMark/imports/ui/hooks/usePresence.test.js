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

    it("sends initial presence update upon mounting with all properties", function () {
      renderHook(() =>
        usePresence({
          fileId: "file-123",
          identity: { userId: "user-1" },
          position: 12.5,
          isPlaying: true,
          playbackRate: 1.5,
          followingUserId: "user-3"
        })
      );

      assert.isTrue(
        callAsyncStub.calledWith("presence.update", {
          fileId: "file-123",
          position: 12.5,
          isPlaying: true,
          playbackRate: 1.5,
          followingUserId: "user-3"
        })
      );
    });

    it("queries PresenceCollection for active participants and formats colors", function () {
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

    it("keeps server membership when a collaborator playhead becomes stale", function () {
      findStub.returns({ fetch: () => [{ userId: "user-2", updatedAt: new Date(Date.now() - 60000) }] });
      const { result } = renderHook(() => usePresence({ fileId: "file-123", identity: { userId: "user-1" }, position: 0 }));
      assert.isEmpty(result.current.others);
      assert.equal(result.current.participants[0].userId, "user-2");
    });

    it("sends heartbeat updates periodically while active", function () {
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
          position: 5.0,
          isPlaying: false,
          playbackRate: 1,
          followingUserId: null
        })
      );
    });

    it("sends throttled update when position changes", function () {
      let position = 5.0;
      const { rerender } = renderHook(() =>
        usePresence({
          fileId: "file-123",
          identity: { userId: "user-1" },
          position
        })
      );

      callAsyncStub.resetHistory();

      position = 6.0;
      rerender();

      // Tick interval check (250ms)
      act(() => {
        clock.tick(250);
      });

      assert.isTrue(
        callAsyncStub.calledWith("presence.update", {
          fileId: "file-123",
          position: 6.0,
          isPlaying: false,
          playbackRate: 1,
          followingUserId: null
        })
      );
    });

    it("sends immediate update when isPlaying, playbackRate, or followingUserId state changes", function () {
      let isPlaying = false;
      let playbackRate = 1;
      let followingUserId = null;

      const { rerender } = renderHook(() =>
        usePresence({
          fileId: "file-123",
          identity: { userId: "user-1" },
          position: 5.0,
          isPlaying,
          playbackRate,
          followingUserId
        })
      );

      callAsyncStub.resetHistory();

      // Change play state
      isPlaying = true;
      rerender();

      act(() => {
        clock.tick(250);
      });

      assert.isTrue(
        callAsyncStub.calledWith("presence.update", {
          fileId: "file-123",
          position: 5.0,
          isPlaying: true,
          playbackRate: 1,
          followingUserId: null
        })
      );

      callAsyncStub.resetHistory();

      // Change playback rate
      playbackRate = 2;
      rerender();

      act(() => {
        clock.tick(250);
      });

      assert.isTrue(
        callAsyncStub.calledWith("presence.update", {
          fileId: "file-123",
          position: 5.0,
          isPlaying: true,
          playbackRate: 2,
          followingUserId: null
        })
      );

      callAsyncStub.resetHistory();

      // Change follow target
      followingUserId = "user-2";
      rerender();

      act(() => {
        clock.tick(250);
      });

      assert.isTrue(
        callAsyncStub.calledWith("presence.update", {
          fileId: "file-123",
          position: 5.0,
          isPlaying: true,
          playbackRate: 2,
          followingUserId: "user-2"
        })
      );
    });

    it("sends leave signal on unmount", function () {
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
