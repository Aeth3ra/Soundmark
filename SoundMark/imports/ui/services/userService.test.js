import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";
import { setDisplayName } from "./userService";
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

      it("trims whitespace and calls users.setDisplayName with valid input", async function () {
        callAsyncStub.withArgs("users.setDisplayName", "Jane Doe").resolves();

        await setDisplayName("  Jane Doe  ");

        assert.isTrue(
          callAsyncStub.calledOnceWith("users.setDisplayName", "Jane Doe")
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
  });
}
