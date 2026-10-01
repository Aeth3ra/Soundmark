import { Meteor } from "meteor/meteor";
import { renderHook, act, cleanup } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { NotificationProvider, useNotifications } from "../components/NotificationProvider";
import { usePresenceNotifications } from "./usePresenceNotifications";
import { useProcessingNotification } from "./useProcessingNotification";
import { useActivityNotifications } from "./useActivityNotifications";
import { useNotifiedExport } from "./useNotifiedExport";

if (Meteor.isClient) {
  describe("notification event hooks", function () {
    let clock;
    const wrapper = ({ children }) => <NotificationProvider fileId="file-a">{children}</NotificationProvider>;
    beforeEach(() => { clock = sinon.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] }); });
    afterEach(() => { cleanup(); sinon.restore(); });
    const alex = { userId: "alex", name: "Alex", position: 0 };
    const presence = { fileId: "file-a", others: [alex], ready: true, connected: true, sessionEnded: false };

    it("silently establishes presence, ignores playheads, and reports each new user once", function () {
      const { result, rerender } = renderHook((props) => { usePresenceNotifications(props); return useNotifications(); }, { wrapper, initialProps: presence });
      assert.isEmpty(result.current.notifications);
      rerender({ ...presence, others: [{ ...alex, position: 12 }] });
      assert.isEmpty(result.current.notifications);
      const others = [alex, { userId: "sam", name: "Sam" }];
      rerender({ ...presence, others });
      rerender({ ...presence, others: [...others] });
      assert.deepEqual(result.current.notifications.map((item) => item.message), ["Sam joined the workspace."]);
    });

    it("delays departures, ignores quick returns, and stops following a confirmed departure", function () {
      const stopFollowing = sinon.spy();
      const props = { ...presence, followingUserId: "alex", stopFollowing };
      const { result, rerender } = renderHook((input) => { usePresenceNotifications(input); return useNotifications(); }, { wrapper, initialProps: props });
      rerender({ ...props, others: [] });
      act(() => clock.tick(1000));
      rerender(props);
      act(() => clock.tick(2000));
      assert.isEmpty(result.current.notifications);
      assert.isFalse(stopFollowing.called);
      rerender({ ...props, others: [] });
      act(() => clock.tick(1500));
      assert.isTrue(stopFollowing.calledOnce);
      assert.include(result.current.notifications[0].message, "Playback sync stopped");
    });

    it("cancels departures on disconnect/session end and silently rebaselines on reconnect", function () {
      const { result, rerender } = renderHook((props) => { usePresenceNotifications(props); return useNotifications(); }, { wrapper, initialProps: presence });
      rerender({ ...presence, others: [] });
      rerender({ ...presence, others: [], connected: false });
      act(() => clock.tick(2000));
      rerender({ ...presence, others: [], connected: true });
      assert.isEmpty(result.current.notifications);
      rerender(presence);
      act(() => result.current.clear());
      rerender({ ...presence, others: [], sessionEnded: true });
      act(() => clock.tick(2000));
      assert.isEmpty(result.current.notifications);
    });

    it("does not announce initial hydration or workspace switches", function () {
      const { result, rerender } = renderHook((props) => { usePresenceNotifications(props); return useNotifications(); }, { wrapper, initialProps: { ...presence, ready: false, others: [] } });
      rerender(presence);
      rerender({ ...presence, fileId: "file-b", others: [{ userId: "new" }] });
      act(() => clock.tick(2000));
      assert.isEmpty(result.current.notifications);
    });

    it("announces only slow successful preview updates", function () {
      const props = { fileId: "file-a", isProcessing: true, audioVersion: 0, isAudioReady: false, audioError: null };
      const { result, rerender } = renderHook((input) => { useProcessingNotification(input); return useNotifications(); }, { wrapper, initialProps: props });
      act(() => clock.tick(100));
      rerender({ ...props, isProcessing: false, isAudioReady: true, audioVersion: 1 });
      assert.isEmpty(result.current.notifications);
      rerender({ ...props, audioVersion: 1 });
      act(() => clock.tick(2100));
      rerender({ ...props, isProcessing: false, audioVersion: 1, audioError: "Failed" });
      assert.isEmpty(result.current.notifications);
      rerender({ ...props, audioVersion: 1 });
      act(() => clock.tick(2100));
      rerender({ ...props, isProcessing: false, isAudioReady: true, audioVersion: 2 });
      assert.lengthOf(result.current.notifications, 1);
      rerender({ ...props, isProcessing: false, isAudioReady: true, audioVersion: 2 });
      assert.lengthOf(result.current.notifications, 1);
    });

    it("does not report an old processing run after changing workspace", function () {
      const props = { fileId: "file-a", isProcessing: true, audioVersion: 0 };
      const { result, rerender } = renderHook((input) => { useProcessingNotification(input); return useNotifications(); }, { wrapper, initialProps: props });
      act(() => clock.tick(3000));
      rerender({ fileId: "file-b", isProcessing: false, isAudioReady: true, audioVersion: 1 });
      assert.isEmpty(result.current.notifications);
    });

    it("groups collaborator additions, excludes own edits, and safely handles deleted View targets", function () {
      const onView = sinon.spy();
      const props = { fileId: "file-a", userId: "me", annotations: [], effects: [], ready: true, connected: true, userNames: { alex: "Alex" }, onView };
      const { result, rerender } = renderHook((input) => { useActivityNotifications(input); return useNotifications(); }, { wrapper, initialProps: props });
      const annotations = [{ _id: "a", createdBy: "alex", start: 1 }, { _id: "b", createdBy: "alex", start: 2 }, { _id: "mine", createdBy: "me" }];
      rerender({ ...props, annotations });
      act(() => clock.tick(1000));
      assert.lengthOf(result.current.notifications, 1);
      assert.equal(result.current.notifications[0].message, "Alex added 2 annotations.");
      act(() => result.current.notifications[0].action.onClick());
      assert.isTrue(onView.calledOnceWith("annotation", annotations[0]));
      rerender({ ...props, annotations: annotations.map((item) => ({ ...item, title: "Changed" })) });
      act(() => clock.tick(1000));
      assert.lengthOf(result.current.notifications, 1);
      const action = result.current.notifications[0].action;
      rerender(props);
      act(() => action.onClick());
      assert.isTrue(onView.calledOnce);
      assert.equal(result.current.notifications[1].message, "This item is no longer available.");
    });

    it("silences initial activity/reconnect and cancels queued events on session end", function () {
      const props = { fileId: "file-a", userId: "me", annotations: [], effects: [{ _id: "old", createdBy: "alex" }], ready: true, connected: true, userNames: {}, onView: sinon.spy() };
      const { result, rerender } = renderHook((input) => { useActivityNotifications(input); return useNotifications(); }, { wrapper, initialProps: props });
      act(() => clock.tick(1000));
      assert.isEmpty(result.current.notifications);
      rerender({ ...props, connected: false });
      const updated = { ...props, effects: [...props.effects, { _id: "new", createdBy: "alex" }] };
      rerender(updated);
      act(() => clock.tick(1000));
      assert.isEmpty(result.current.notifications);
      rerender({ ...updated, effects: [...updated.effects, { _id: "latest", createdBy: "alex" }] });
      rerender({ ...updated, sessionEnded: true });
      act(() => clock.tick(1000));
      assert.isEmpty(result.current.notifications);
    });

    it("blocks duplicate exports and retries the original failed operation", async function () {
      let reject;
      const action = sinon.stub().onFirstCall().returns(new Promise((_resolve, fail) => { reject = fail; })).onSecondCall().resolves();
      const { result } = renderHook(() => ({ ...useNotifiedExport("file-a"), ...useNotifications() }), { wrapper });
      let request;
      act(() => {
        request = result.current.run({ action, pending: "Rendering", errorMessage: "Failed" });
        void result.current.run({ action, pending: "Rendering", errorMessage: "Failed" });
      });
      assert.isTrue(action.calledOnce);
      assert.isTrue(result.current.isExporting);
      await act(async () => { reject(new Error("Export failed")); await request; });
      assert.isFalse(result.current.isExporting);
      assert.equal(result.current.notifications[0].type, "error");
      await act(async () => { await result.current.notifications[0].action.onClick(); });
      assert.isTrue(action.calledTwice);
      assert.lengthOf(result.current.notifications, 1);
      assert.equal(result.current.notifications[0].message, "Export ready—download started.");
    });

    it("does not reuse an old workspace export state or retry in a new workspace", async function () {
      const action = sinon.stub().rejects(new Error("Failed"));
      const { result, rerender } = renderHook(({ fileId }) => ({ ...useNotifiedExport(fileId), ...useNotifications() }), { wrapper, initialProps: { fileId: "file-a" } });
      await act(async () => { await result.current.run({ action, pending: "Rendering", errorMessage: "Failed" }); });
      const retry = result.current.notifications[0].action.onClick;
      rerender({ fileId: "file-b" });
      await act(async () => { await retry(); });
      rerender({ fileId: "file-a" });
      assert.isFalse(result.current.isExporting);
      assert.isTrue(action.calledOnce);
    });

    it("makes old retry callbacks inert after an export component unmounts", async function () {
      const action = sinon.stub().rejects(new Error("Failed"));
      const { result, unmount } = renderHook(() => ({ ...useNotifiedExport("file-a"), ...useNotifications() }), { wrapper });
      await act(async () => { await result.current.run({ action, pending: "Rendering", errorMessage: "Failed" }); });
      const retry = result.current.notifications[0].action.onClick;
      unmount();
      await retry();
      assert.isTrue(action.calledOnce);
    });
  });
}
