import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Tracker } from "meteor/tracker";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, fireEvent, act, cleanup } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { LoginPage } from "./LoginPage";

if (Meteor.isClient) {
  describe("LoginPage guest session", function () {
    let userId, loggingIn, dependency, login, calls;
    beforeEach(function () {
      userId = null;
      loggingIn = false;
      dependency = new Tracker.Dependency();
      sinon.stub(Meteor, "userId").callsFake(() => { dependency.depend(); return userId; });
      sinon.stub(Meteor, "user").returns(null);
      sinon.stub(Meteor, "loggingIn").callsFake(() => { dependency.depend(); return loggingIn; });
      login = sinon.stub(Accounts, "callLoginMethod");
      calls = sinon.stub(Meteor, "callAsync").resolves(null);
    });
    afterEach(function () { cleanup(); sinon.restore(); });

    const show = (entry = "/login") => render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>Upload page</p>} />
          <Route path="/player/file-a" element={<p>Requested workspace</p>} />
        </Routes>
      </MemoryRouter>
    );

    it("starts a guest session on a direct login visit and waits before saving", async function () {
      const { getByPlaceholderText, getByRole, getByText } = show();
      assert.isTrue(login.calledOnce);
      fireEvent.change(getByPlaceholderText("e.g. Alice"), { target: { value: "  Alice  " } });
      assert.isTrue(getByRole("button", { name: "Connecting…" }).disabled);
      fireEvent.submit(getByPlaceholderText("e.g. Alice").closest("form"));
      assert.isFalse(calls.calledWith("user.setDisplayName"));
      await act(async () => {
        userId = "guest-1";
        login.firstCall.args[0].userCallback(null);
        dependency.changed(); Tracker.flush();
      });
      assert.isFalse(getByRole("button", { name: "Continue" }).disabled);
      await act(async () => { fireEvent.click(getByRole("button", { name: "Continue" })); });
      assert.isTrue(calls.calledWithExactly("user.setDisplayName", "Alice"));
      assert.exists(getByText("Upload page"));
    });

    it("waits for a stored session to resume instead of creating a new guest", async function () {
      loggingIn = true;
      const { getByRole } = show();
      assert.isFalse(login.called);
      assert.isTrue(getByRole("button", { name: "Connecting…" }).disabled);
      await act(async () => {
        userId = "existing-guest"; loggingIn = false;
        dependency.changed(); Tracker.flush();
      });
      assert.isFalse(login.called);
      assert.exists(getByRole("button", { name: "Continue" }));
    });

    it("shows a session error without trying to save when guest login fails", async function () {
      login.callsFake(({ userCallback }) => userCallback(new Error("Login failed")));
      let view;
      await act(async () => { view = show(); });
      fireEvent.change(view.getByPlaceholderText("e.g. Alice"), { target: { value: "Alice" } });
      assert.include(view.getByRole("alert").textContent, "Couldn't start your session");
      assert.isTrue(view.getByRole("button", { name: "Continue" }).disabled);
      fireEvent.submit(view.getByPlaceholderText("e.g. Alice").closest("form"));
      assert.isFalse(calls.calledWith("user.setDisplayName"));
    });

    it("preserves the requested workspace for an existing guest", async function () {
      userId = "existing-guest";
      let view;
      await act(async () => { view = show({ pathname: "/login", state: { from: "/player/file-a" } }); });
      fireEvent.change(view.getByPlaceholderText("e.g. Alice"), { target: { value: "Alice" } });
      await act(async () => { fireEvent.click(view.getByRole("button", { name: "Continue" })); });
      assert.exists(view.getByText("Requested workspace"));
      assert.isFalse(login.called);
    });
  });
}
