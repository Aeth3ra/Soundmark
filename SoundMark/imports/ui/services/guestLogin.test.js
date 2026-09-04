import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { assert } from "chai";
import sinon from "sinon";
import { loginAsGuest } from "./guestLogin";

if (Meteor.isClient) {
  describe("loginAsGuest", function () {
    let callLoginMethodStub;

    beforeEach(function () {
      callLoginMethodStub = sinon.stub(Accounts, "callLoginMethod");
    });

    afterEach(function () {
      sinon.restore();
    });

    it("resolves successfully when guest login succeeds", async function () {
      callLoginMethodStub.callsFake(({ methodArguments, userCallback }) => {
        assert.deepEqual(methodArguments, [{ guest: true }]);
        userCallback(null);
      });

      await loginAsGuest();
      assert.isTrue(callLoginMethodStub.calledOnce);
    });

    it("rejects with an error when guest login fails", async function () {
      const fakeError = new Error("Guest accounts disabled");

      callLoginMethodStub.callsFake(({ userCallback }) => {
        userCallback(fakeError);
      });

      try {
        await loginAsGuest();
        assert.fail("Expected loginAsGuest to reject");
      } catch (err) {
        assert.equal(err, fakeError);
        assert.equal(err.message, "Guest accounts disabled");
      }
    });
  });
}
