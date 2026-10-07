import { Meteor } from "meteor/meteor";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { assert } from "chai";
import { NotificationProvider, useNotifications } from "./NotificationProvider";
import { SessionEndedToast } from "./SessionEndToast";

if (Meteor.isClient) {
  describe("session-ended notifications", function () {
    afterEach(cleanup);
    it("consumes the redirect flag once, preserves other state, and survives navigation", function () {
      let api, location, navigate;
      function Contents() {
        api = useNotifications(); location = useLocation(); navigate = useNavigate();
        return <SessionEndedToast />;
      }
      render(<MemoryRouter initialEntries={[{ pathname: "/", state: { sessionEnded: true, other: "keep" } }]}>
        <NotificationProvider><Contents /></NotificationProvider>
      </MemoryRouter>);
      assert.lengthOf(api.notifications, 1);
      assert.equal(api.notifications[0].message, "The host ended the session.");
      assert.deepEqual(location.state, { other: "keep" });
      act(() => navigate("/login"));
      assert.lengthOf(api.notifications, 1);
    });
  });
}
