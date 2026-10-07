import { Meteor } from "meteor/meteor";
import { renderHook, render, act, fireEvent, cleanup } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { NotificationProvider, useNotifications } from "./NotificationProvider";
import { NotificationHistory } from "./NotificationHistory";
import { NotificationToast } from "./NotificationToast";

if (Meteor.isClient) {
  describe("notifications", function () {
    afterEach(() => { cleanup(); sinon.restore(); });
    const wrapper = ({ children }) => <NotificationProvider fileId="file-a">{children}</NotificationProvider>;

    it("updates one operation, deduplicates IDs, and retains dismissed history", function () {
      const { result } = renderHook(useNotifications, { wrapper });
      act(() => result.current.notify({ id: "export", fileId: "file-a", type: "pending", message: "Rendering" }));
      act(() => result.current.notify({ id: "export", fileId: "file-a", type: "pending", message: "Rendering" }));
      act(() => result.current.update("export", { type: "success", message: "Ready" }));
      assert.lengthOf(result.current.notifications, 1);
      assert.equal(result.current.notifications[0].message, "Ready");
      act(() => result.current.dismiss("export"));
      assert.isFalse(result.current.notifications[0].visible);
      act(() => result.current.markRead());
      assert.isTrue(result.current.notifications[0].read);
    });

    it("shows the outcome even if the progress notification was dismissed", function () {
      const { result } = renderHook(useNotifications, { wrapper });
      act(() => result.current.notify({ id: "export", type: "pending", message: "Rendering" }));
      act(() => result.current.dismiss("export"));
      act(() => result.current.update("export", { type: "error", message: "Failed" }));
      assert.isTrue(result.current.notifications[0].visible);
      assert.equal(result.current.notifications[0].type, "error");
    });

    it("limits history to 30 and visible toasts to three", function () {
      const { result } = renderHook(useNotifications, { wrapper });
      act(() => { for (let i = 0; i < 35; i++) result.current.notify({ message: `Event ${i}` }); });
      assert.lengthOf(result.current.notifications, 30);
      assert.lengthOf(document.querySelectorAll('[role="status"]'), 3);
    });

    it("preserves global messages across navigation and removes old workspace actions", function () {
      let scope = "file-a";
      const scopedWrapper = ({ children }) => <NotificationProvider fileId={scope}>{children}</NotificationProvider>;
      const { result, rerender } = renderHook(useNotifications, { wrapper: scopedWrapper });
      act(() => {
        result.current.notify({ id: "session", message: "Session ended" });
        result.current.notify({ id: "retry", fileId: "file-a", message: "Failed", action: { label: "Retry", onClick: sinon.spy() } });
      });
      scope = "file-b";
      rerender();
      assert.deepEqual(result.current.notifications.map((item) => item.id), ["session"]);
      scope = "file-a";
      rerender();
      const retry = result.current.notifications.find((item) => item.id === "retry");
      assert.isUndefined(retry.action);
      assert.isFalse(retry.visible);
    });

    it("keeps active jobs when clearing history", function () {
      const { result } = renderHook(useNotifications, { wrapper });
      act(() => {
        result.current.notify({ type: "pending", message: "Rendering" });
        result.current.notify({ message: "Joined" });
      });
      act(() => result.current.clear());
      assert.lengthOf(result.current.notifications, 1);
      assert.equal(result.current.notifications[0].type, "pending");
    });

    it("pauses auto-dismiss on hover/focus and keeps errors until dismissed", function () {
      const clock = sinon.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
      const onDismiss = sinon.spy();
      const { getByRole, rerender } = render(<NotificationToast notification={{ id: "n", type: "success", message: "Ready", revision: 1 }} onDismiss={onDismiss} />);
      fireEvent.mouseEnter(getByRole("status"));
      act(() => clock.tick(6000));
      assert.isFalse(onDismiss.called);
      fireEvent.mouseLeave(getByRole("status"));
      fireEvent.focus(getByRole("button", { name: "Dismiss notification" }));
      act(() => clock.tick(6000));
      assert.isFalse(onDismiss.called);
      fireEvent.blur(getByRole("button", { name: "Dismiss notification" }));
      act(() => clock.tick(5000));
      assert.isTrue(onDismiss.calledOnceWith("n"));
      onDismiss.resetHistory();
      rerender(<NotificationToast notification={{ id: "n", type: "error", message: "Failed", revision: 2 }} onDismiss={onDismiss} />);
      act(() => clock.tick(10000));
      assert.isFalse(onDismiss.called);
      fireEvent.click(getByRole("button", { name: "Dismiss notification" }));
      assert.isTrue(onDismiss.calledOnce);
    });

    it("shows history and clears completed messages", function () {
      let api;
      function Contents() { api = useNotifications(); return <NotificationHistory />; }
      const { getByText, getByLabelText } = render(<NotificationProvider><Contents /></NotificationProvider>);
      act(() => api.notify({ message: "Alex joined" }));
      assert.exists(getByLabelText("Notifications, 1 unread"));
      const details = getByLabelText("Notifications, 1 unread").closest("details");
      details.open = true;
      fireEvent(details, new Event("toggle"));
      assert.exists(getByLabelText("Notifications"));
      fireEvent.click(getByText("Clear all"));
      assert.exists(getByText("No notifications yet."));
    });
  });
}
