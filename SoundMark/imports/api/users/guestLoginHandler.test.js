import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { assert } from "chai";
import "./guestLoginHandler";

if (Meteor.isServer) {
  describe('accounts.loginHandlers "guest"', function () {
    let handler;

    before(function () {
      // Accounts.registerLoginHandler doesn't return or export anything,
      // so -- like Meteor.server.method_handlers for methods -- we reach
      // into Accounts' internal registry to get the actual handler
      // function that guestLoginHandler.js registered.
      const entry = Accounts._loginHandlers.find((h) => h.name === "guest");
      assert.isOk(entry, 'expected a "guest" login handler to be registered');
      handler = entry.handler;
    });

    // Runs before every `it` block below, giving each test a clean,
    // predictable starting state instead of leftover data from the
    // previous test.
    beforeEach(async function () {
      await Meteor.users.removeAsync({});
    });

    it("returns undefined and creates no user when options.guest is missing", async function () {
      const result = await handler({});
      assert.isUndefined(result);
      assert.equal(await Meteor.users.find({}).countAsync(), 0);
    });

    it("returns undefined and creates no user when options.guest is false", async function () {
      const result = await handler({ guest: false });
      assert.isUndefined(result);
      assert.equal(await Meteor.users.find({}).countAsync(), 0);
    });

    it("returns undefined for a normal (non-guest) login attempt, leaving it to other handlers", async function () {
      const result = await handler({
        password: "hunter2",
        user: { username: "alice" }
      });
      assert.isUndefined(result);
      assert.equal(await Meteor.users.find({}).countAsync(), 0);
    });

    it("creates a new guest user and returns { userId } when options.guest is true", async function () {
      const result = await handler({ guest: true });

      assert.isOk(result);
      assert.isString(result.userId);

      const user = await Meteor.users.findOneAsync(result.userId);
      assert.isOk(user); // actually persisted, not just returned
      assert.isTrue(user.guest); // flagged for future cleanup/filtering
      assert.instanceOf(user.createdAt, Date);
    });

    it("sets createdAt close to the current time", async function () {
      const before = Date.now();
      const result = await handler({ guest: true });
      const after = Date.now();

      const user = await Meteor.users.findOneAsync(result.userId);
      const createdAtMs = user.createdAt.getTime();
      assert.isAtLeast(createdAtMs, before);
      assert.isAtMost(createdAtMs, after);
    });

    it("creates a distinct user on each call", async function () {
      const first = await handler({ guest: true });
      const second = await handler({ guest: true });

      assert.notEqual(first.userId, second.userId);
      assert.equal(await Meteor.users.find({}).countAsync(), 2);
    });
  });
}
