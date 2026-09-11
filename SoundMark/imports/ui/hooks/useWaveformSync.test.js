import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useWaveformSync } from "./useWaveformSync";

if (Meteor.isClient) {
  describe("useWaveformSync", function () {
    let seekToSpy;
    let playSpy;
    let pauseSpy;
    let setFollowingUserIdSpy;
    let setPlaybackRateSpy;
    let clock;

    const currentUserId = "user-me";
    const duration = 100; // 100 seconds for easy progress calculation

    beforeEach(function () {
      clock = sinon.useFakeTimers();
      seekToSpy = sinon.spy();
      playSpy = sinon.spy();
      pauseSpy = sinon.spy();
      setFollowingUserIdSpy = sinon.spy();
      setPlaybackRateSpy = sinon.spy();
    });

    afterEach(function () {
      clock.restore();
      sinon.restore();
    });

    it("identifies targetUser based on followingUserId", function () {
      const otherUsers = [
        { userId: "user-1", name: "Alice", position: 10, isPlaying: false },
        { userId: "user-2", name: "Bob", position: 20, isPlaying: true }
      ];

      const { result } = renderHook(() =>
        useWaveformSync({
          duration,
          otherUsers,
          followingUserId: "user-2",
          setFollowingUserId: setFollowingUserIdSpy,
          currentUserId,
          currentTime: 0,
          seekTo: seekToSpy,
          play: playSpy,
          pause: pauseSpy,
          isPlaying: false,
          playbackRate: 1,
          setPlaybackRate: setPlaybackRateSpy
        })
      );

      assert.deepEqual(result.current.targetUser, otherUsers[1]);
    });

    it("prevents following a user who is already following the current user (mutual lock block)", function () {
      const otherUsers = [
        {
          userId: "user-1",
          name: "Alice",
          followingUserId: currentUserId,
          position: 10
        }
      ];

      const { result } = renderHook(() =>
        useWaveformSync({
          duration,
          otherUsers,
          followingUserId: null,
          setFollowingUserId: setFollowingUserIdSpy,
          currentUserId,
          currentTime: 0,
          seekTo: seekToSpy,
          play: playSpy,
          pause: pauseSpy,
          isPlaying: false,
          playbackRate: 1,
          setPlaybackRate: setPlaybackRateSpy
        })
      );

      act(() => {
        result.current.toggleFollow("user-1");
      });

      assert.isFalse(setFollowingUserIdSpy.called);
      assert.equal(
        result.current.syncError,
        "Cannot sync to Alice because they are already following you."
      );
    });

    it("allows following a user and clears existing sync error", function () {
      const otherUsers = [
        { userId: "user-1", name: "Alice", followingUserId: null, position: 10 }
      ];

      const { result } = renderHook(() =>
        useWaveformSync({
          duration,
          otherUsers,
          followingUserId: null,
          setFollowingUserId: setFollowingUserIdSpy,
          currentUserId,
          currentTime: 0,
          seekTo: seekToSpy,
          play: playSpy,
          pause: pauseSpy,
          isPlaying: false,
          playbackRate: 1,
          setPlaybackRate: setPlaybackRateSpy
        })
      );

      act(() => {
        result.current.toggleFollow("user-1");
      });

      assert.isTrue(setFollowingUserIdSpy.calledWith("user-1"));
      assert.isNull(result.current.syncError);
    });

    it("unfollows when toggleFollow is called for the currently followed user", function () {
      const otherUsers = [{ userId: "user-1", name: "Alice", position: 10 }];

      const { result } = renderHook(() =>
        useWaveformSync({
          duration,
          otherUsers,
          followingUserId: "user-1",
          setFollowingUserId: setFollowingUserIdSpy,
          currentUserId,
          currentTime: 0,
          seekTo: seekToSpy,
          play: playSpy,
          pause: pauseSpy,
          isPlaying: false,
          playbackRate: 1,
          setPlaybackRate: setPlaybackRateSpy
        })
      );

      act(() => {
        result.current.toggleFollow("user-1");
      });

      assert.isTrue(setFollowingUserIdSpy.calledWith(null));
      assert.isNull(result.current.syncError);
    });

    it("breaks sync automatically if target user starts following current user mid-session", function () {
      let otherUsers = [
        { userId: "user-1", name: "Alice", followingUserId: null, position: 10 }
      ];

      const { result, rerender } = renderHook(() =>
        useWaveformSync({
          duration,
          otherUsers,
          followingUserId: "user-1",
          setFollowingUserId: setFollowingUserIdSpy,
          currentUserId,
          currentTime: 0,
          seekTo: seekToSpy,
          play: playSpy,
          pause: pauseSpy,
          isPlaying: false,
          playbackRate: 1,
          setPlaybackRate: setPlaybackRateSpy
        })
      );

      // Target user changes state to follow us
      otherUsers = [
        {
          userId: "user-1",
          name: "Alice",
          followingUserId: currentUserId,
          position: 10
        }
      ];

      rerender();

      assert.isTrue(setFollowingUserIdSpy.calledWith(null));
      assert.equal(
        result.current.syncError,
        "Sync broken: Alice started following you."
      );
    });

    it("syncs position (clamping 0-1) and play state when target updates", function () {
      const otherUsers = [
        { userId: "user-1", name: "Alice", position: 50, isPlaying: true }
      ];

      renderHook(() =>
        useWaveformSync({
          duration,
          otherUsers,
          followingUserId: "user-1",
          setFollowingUserId: setFollowingUserIdSpy,
          currentUserId,
          currentTime: 0,
          seekTo: seekToSpy,
          play: playSpy,
          pause: pauseSpy,
          isPlaying: false,
          playbackRate: 1,
          setPlaybackRate: setPlaybackRateSpy
        })
      );

      // position 50 / duration 100 = 0.5
      assert.isTrue(seekToSpy.calledWith(0.5));

      // Advance clock past polling interval (300ms) to trigger play state sync
      act(() => {
        clock.tick(300);
      });

      assert.isTrue(playSpy.calledOnce);
      assert.isFalse(pauseSpy.called);
    });

    it("syncs playback rate when target has a different playback rate", function () {
      const otherUsers = [
        {
          userId: "user-1",
          name: "Alice",
          position: 10,
          isPlaying: true,
          playbackRate: 1.5
        }
      ];

      renderHook(() =>
        useWaveformSync({
          duration,
          otherUsers,
          followingUserId: "user-1",
          setFollowingUserId: setFollowingUserIdSpy,
          currentUserId,
          currentTime: 0,
          seekTo: seekToSpy,
          play: playSpy,
          pause: pauseSpy,
          isPlaying: false,
          playbackRate: 1,
          setPlaybackRate: setPlaybackRateSpy
        })
      );

      assert.isTrue(setPlaybackRateSpy.calledWith(1.5));
    });

    it("syncs pause state when target user pauses", function () {
      const otherUsers = [
        { userId: "user-1", name: "Alice", position: 20, isPlaying: false }
      ];

      renderHook(() =>
        useWaveformSync({
          duration,
          otherUsers,
          followingUserId: "user-1",
          setFollowingUserId: setFollowingUserIdSpy,
          currentUserId,
          currentTime: 0,
          seekTo: seekToSpy,
          play: playSpy,
          pause: pauseSpy,
          isPlaying: true,
          playbackRate: 1,
          setPlaybackRate: setPlaybackRateSpy
        })
      );

      // Advance clock past polling interval (300ms) to trigger pause state sync
      act(() => {
        clock.tick(300);
      });

      assert.isTrue(pauseSpy.calledOnce);
      assert.isFalse(playSpy.called);
    });

    it("clears sync error on demand", function () {
      const otherUsers = [
        { userId: "user-1", name: "Alice", followingUserId: currentUserId }
      ];

      const { result } = renderHook(() =>
        useWaveformSync({
          duration,
          otherUsers,
          followingUserId: null,
          setFollowingUserId: setFollowingUserIdSpy,
          currentUserId,
          currentTime: 0,
          seekTo: seekToSpy,
          play: playSpy,
          pause: pauseSpy,
          isPlaying: false,
          playbackRate: 1,
          setPlaybackRate: setPlaybackRateSpy
        })
      );

      // Trigger error
      act(() => {
        result.current.toggleFollow("user-1");
      });
      assert.isNotNull(result.current.syncError);

      // Clear error
      act(() => {
        result.current.clearSyncError();
      });
      assert.isNull(result.current.syncError);
    });
  });
}
