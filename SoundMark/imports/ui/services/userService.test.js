import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";
import { setDisplayName, getUser } from "./userService";
if (Meteor.isClient) {
  describe("userService", function () {
    let callAsyncStub;

    beforeEach(function () {
      callAsyncStub = sinon.stub(Meteor, "callAsync");
    });

    afterEach(function () {
      sinon.restore();
    });

    describe("setDisplayName", function () {
      it("throws a validation error for empty or whitespace-only names", async function () {
        try {
          await setDisplayName("   ");
          assert.fail("Expected setDisplayName to throw");
        } catch (err) {
          assert.equal(err.message, "Enter a name to continue.");
        }

        assert.isFalse(callAsyncStub.called);
      });

      it("trims whitespace and calls user.setDisplayName with valid input", async function () {
        callAsyncStub.withArgs("user.setDisplayName", "Jane Doe").resolves();

        await setDisplayName("  Jane Doe  ");

        assert.isTrue(
          callAsyncStub.calledOnceWith("user.setDisplayName", "Jane Doe")
        );
      });

      it("catches server errors and throws a friendly user error", async function () {
        callAsyncStub.rejects(new Error("Internal Server Error"));

        try {
          await setDisplayName("Jane Doe");
          assert.fail("Expected setDisplayName to throw");
        } catch (err) {
          assert.equal(err.message, "Couldn't save your name. Try again.");
        }
      });
    });
    describe("getUser", function () {
      it("returns the user's name when the server call succeeds", async function () {
        callAsyncStub.withArgs("user.get").resolves("Jane Doe");
        const result = await getUser();
        assert.equal(result, "Jane Doe");
        assert.isTrue(callAsyncStub.calledOnceWith("user.get"));
      });
      it("returns null when no user is logged in", async function () {
        callAsyncStub.withArgs("user.get").resolves(null);
        const result = await getUser();
        assert.isNull(result);
        assert.isTrue(callAsyncStub.calledOnceWith("user.get"));
      });
      it("catches server errors and throws a friendly user error", async function () {
        callAsyncStub
          .withArgs("user.get")
          .rejects(new Error("Internal Server Error"));
        try {
          await getUser();
          assert.fail("Expected getUser to throw");
        } catch (err) {
          assert.equal(err.message, "Couldn't find user. Try again.");
        }
      });
    });
  });
}
