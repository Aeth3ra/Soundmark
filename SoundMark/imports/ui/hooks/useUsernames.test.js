import { Meteor } from "meteor/meteor";
import { renderHook } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useUserNames } from "./useUsernames";

if (Meteor.isClient) {
  describe("useUserNames", function () {
    let stub;

    beforeEach(function () {
      stub = sinon.stub(Meteor.users, "find").returns({
        forEach: (cb) => {
          cb({ _id: "user-1", profile: { name: "Alice" } });
        }
      });
    });

    afterEach(function () {
      stub.restore();
    });

    it("constructs user map from Meteor.users, presence, and props", function () {
      const params = {
        fileId: "file-123",
        otherUsers: [{ userId: "user-2", name: "Bob" }],
        userId: "user-3",
        name: "Charlie"
      };

      const { result } = renderHook(() => useUserNames(params));

      assert.deepEqual(result.current, {
        "user-1": "Alice",
        "user-2": "Bob",
        "user-3": "Charlie"
      });
    });
  });
}
