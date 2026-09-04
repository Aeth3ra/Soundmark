import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import "./userMethods";

if (Meteor.isServer) {
  describe("users.methods", function () {
    let userId;

    // Runs before every `it` block below, giving each test a clean,
    // predictable starting state instead of leftover data from the
    // previous test.
    beforeEach(async function () {
      await Meteor.users.removeAsync({});
      userId = await Meteor.users.insertAsync({ createdAt: new Date() });
    });

    describe("users.setDisplayName", function () {
      it("throws not-authorized when no user is logged in", async function () {
        try {
          await Meteor.server.method_handlers["users.setDisplayName"].apply(
            { userId: null },
            ["Alice"]
          );
          // If we reach this line, the method didn't throw -- fail explicitly
          assert.fail("expected the method to throw");
        } catch (err) {
          assert.equal(err.error, "not-authorized");
        }
      });

      it("rejects invalid argument types via check()", async function () {
        try {
          await Meteor.server.method_handlers["users.setDisplayName"].apply(
            { userId },
            [12345]
          );
          assert.fail("expected the method to throw");
        } catch (err) {
          assert.match(err.message, /Match error/);
        }
      });

      it("throws invalid-name when the name is empty", async function () {
        try {
          await Meteor.server.method_handlers["users.setDisplayName"].apply(
            { userId },
            [""]
          );
          assert.fail("expected the method to throw");
        } catch (err) {
          assert.equal(err.error, "invalid-name");
        }
      });

      it("throws invalid-name when the name is only whitespace", async function () {
        try {
          await Meteor.server.method_handlers["users.setDisplayName"].apply(
            { userId },
            ["   \t  "]
          );
          assert.fail("expected the method to throw");
        } catch (err) {
          assert.equal(err.error, "invalid-name");
        }
      });

      it("trims the name and sets profile.name on the caller's own account", async function () {
        await Meteor.server.method_handlers["users.setDisplayName"].apply(
          { userId },
          ["  Bob Smith  "]
        );

        const user = await Meteor.users.findOneAsync(userId);
        assert.equal(user.profile.name, "Bob Smith"); // .trim() applied
      });

      it("only ever touches this.userId, even if other users exist", async function () {
        const otherUserId = await Meteor.users.insertAsync({
          createdAt: new Date(),
          profile: { name: "Untouched" }
        });

        await Meteor.server.method_handlers["users.setDisplayName"].apply(
          { userId },
          ["Carol"]
        );

        const caller = await Meteor.users.findOneAsync(userId);
        const other = await Meteor.users.findOneAsync(otherUserId);

        assert.equal(caller.profile.name, "Carol");
        assert.equal(other.profile.name, "Untouched"); // unaffected
      });
    });
  });
}
