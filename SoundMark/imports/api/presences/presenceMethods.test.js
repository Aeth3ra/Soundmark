import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";
import { PresenceCollection } from "./presenceCollection";
import { SessionsCollection } from "../sessions/sessionCollection";
import { AudioCollection } from "../audio/audioCollection";
import "./presenceMethods"; // side-effect import: registers the methods
import { cleanupStalePresence } from "./presenceMethods";

if (Meteor.isServer) {
  describe("presence.methods", function () {
    const userId = "testUser1";
    const fileId = "file-1";

    beforeEach(async function () {
      await PresenceCollection.removeAsync({});
      await SessionsCollection.removeAsync({});
      await AudioCollection.removeAsync({});
      await Meteor.users.removeAsync({});
    });

    afterEach(function () {
      sinon.restore();
    });

    describe("presence.update", function () {
      it("throws not-authorized when no user is logged in", async function () {
        try {
          await Meteor.server.method_handlers["presence.update"].apply(
            { userId: null },
            [{ fileId, position: 0 }]
          );
          assert.fail("expected the method to throw");
        } catch (err) {
          assert.equal(err.error, "not-authorized");
        }
      });

      it("rejects a payload that doesn't match the expected shape", async function () {
        try {
          await Meteor.server.method_handlers["presence.update"].apply(
            { userId },
            [{ fileId }] // missing `position`
          );
          assert.fail("expected the method to throw");
        } catch (err) {
          assert.match(err.message, /Match failed/);
        }
      });

      it("creates a new session and marks the caller as host when the room is empty", async function () {
        await Meteor.server.method_handlers["presence.update"].apply(
          { userId },
          [{ fileId, position: 12 }]
        );

        const session = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.isOk(session);
        assert.equal(session.hostId, userId);

        const presence = await PresenceCollection.findOneAsync({
          fileId,
          userId
        });
        assert.isOk(presence);
        assert.equal(presence.position, 12);
        assert.equal(presence.name, "Guest"); // no profile.name set on this user
      });

      it("uses the user's profile name when available", async function () {
        await Meteor.users.insertAsync({
          _id: userId,
          profile: { name: "Alice" }
        });

        await Meteor.server.method_handlers["presence.update"].apply(
          { userId },
          [{ fileId, position: 1 }]
        );

        const presence = await PresenceCollection.findOneAsync({
          fileId,
          userId
        });
        assert.equal(presence.name, "Alice");
      });

      it("does not create a second session or change the host when one already exists", async function () {
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: "original-host",
          createdAt: new Date()
        });

        await Meteor.server.method_handlers["presence.update"].apply(
          { userId },
          [{ fileId, position: 5 }]
        );

        const session = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.equal(session.hostId, "original-host"); // unchanged

        const presence = await PresenceCollection.findOneAsync({
          fileId,
          userId
        });
        assert.isOk(presence); // the joining guest still gets recorded
      });

      it("drops the update without creating a session when the room is mid-teardown", async function () {
        // No session exists, but a stray presence doc does -- this is the
        // window right after a host leaves, before everyone else has been
        // kicked out. The method should refuse to let a new host claim it.
        await PresenceCollection.insertAsync({
          fileId,
          userId: "still-leaving-user",
          name: "Leftover",
          updatedAt: new Date()
        });

        await Meteor.server.method_handlers["presence.update"].apply(
          { userId },
          [{ fileId, position: 5 }]
        );

        const session = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.isUndefined(session); // no session was created

        const newPresence = await PresenceCollection.findOneAsync({
          fileId,
          userId
        });
        assert.isUndefined(newPresence); // the caller's own update was silently dropped
      });

      it("survives a concurrent session-insert race (duplicate key error)", async function () {
        // Simulate another request winning the race: a session already
        // exists by the time insertAsync runs, even though our own
        // findOneAsync check (stubbed below) reported nothing.
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: "other-user",
          createdAt: new Date()
        });
        sinon.stub(SessionsCollection, "findOneAsync").resolves(null);

        await Meteor.server.method_handlers["presence.update"].apply(
          { userId },
          [{ fileId, position: 1 }]
        );

        sinon.restore(); // stop stubbing before reading real state back

        const session = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.equal(session.hostId, "other-user"); // untouched by our failed insert

        const presence = await PresenceCollection.findOneAsync({
          fileId,
          userId
        });
        assert.isOk(presence); // presence still gets recorded despite the race
      });
    });

    describe("presence.leave", function () {
      it("does nothing when no user is logged in", async function () {
        await Meteor.server.method_handlers["presence.leave"].apply(
          { userId: null },
          [{ fileId }]
        );
        // no throw, no side effects -- nothing further to assert
      });

      it("removes only the caller's own presence doc when they are not the host", async function () {
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: "the-host",
          createdAt: new Date()
        });
        await PresenceCollection.insertAsync({ fileId, userId, name: "Me" });
        await PresenceCollection.insertAsync({
          fileId,
          userId: "the-host",
          name: "Host"
        });

        await Meteor.server.method_handlers["presence.leave"].apply(
          { userId },
          [{ fileId }]
        );

        const mine = await PresenceCollection.findOneAsync({ fileId, userId });
        assert.isUndefined(mine);

        const hosts = await PresenceCollection.findOneAsync({
          fileId,
          userId: "the-host"
        });
        assert.isOk(hosts); // the host's presence is untouched

        const session = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.isOk(session); // session survives a non-host leaving
      });

      it("ends the session entirely when the host leaves", async function () {
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: userId,
          createdAt: new Date()
        });
        await PresenceCollection.insertAsync({ fileId, userId, name: "Host" });
        await PresenceCollection.insertAsync({
          fileId,
          userId: "a-guest",
          name: "Guest"
        });

        await Meteor.server.method_handlers["presence.leave"].apply(
          { userId },
          [{ fileId }]
        );

        const session = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.isUndefined(session);

        const remainingPresences = await PresenceCollection.find({
          fileId
        }).countAsync();
        assert.equal(remainingPresences, 0); // everyone's presence cleared, not just the host's
      });

      it("ending the session is safe even with no matching audio file to delete", async function () {
        // deleteAudioFile() no-ops when AudioCollection has no doc with this
        // _id -- confirming that here means we don't need to stub the R2
        // client at all just to test presence.leave.
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: userId,
          createdAt: new Date()
        });
        await PresenceCollection.insertAsync({ fileId, userId, name: "Host" });

        await Meteor.server.method_handlers["presence.leave"].apply(
          { userId },
          [{ fileId }]
        );
        // reaching this line without an exception is the assertion
      });
    });

    describe("cleanupStalePresence", function () {
      // A helper to insert a presence doc with a controllable `updatedAt`,
      // since "staleness" is entirely a function of that timestamp -- no
      // real waiting or fake timers required.
      function staleDate(msAgo) {
        return new Date(Date.now() - msAgo);
      }

      it("leaves fresh (non-stale) presence docs untouched", async function () {
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: userId,
          createdAt: new Date()
        });
        await PresenceCollection.insertAsync({
          fileId,
          userId,
          name: "Host",
          updatedAt: staleDate(1000) // 1s old, well under the 15s threshold
        });

        await cleanupStalePresence();

        const presence = await PresenceCollection.findOneAsync({
          fileId,
          userId
        });
        assert.isOk(presence); // still there
        const session = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.isOk(session); // still there
      });

      it("removes a stale guest's presence without ending the session", async function () {
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: "the-host",
          createdAt: new Date()
        });
        await PresenceCollection.insertAsync({
          fileId,
          userId: "the-host",
          name: "Host",
          updatedAt: staleDate(1000) // host is still fresh
        });
        await PresenceCollection.insertAsync({
          fileId,
          userId: "stale-guest",
          name: "Guest",
          updatedAt: staleDate(20000) // 20s old, over the 15s threshold
        });

        await cleanupStalePresence();

        const guest = await PresenceCollection.findOneAsync({
          fileId,
          userId: "stale-guest"
        });
        assert.isUndefined(guest); // removed

        const host = await PresenceCollection.findOneAsync({
          fileId,
          userId: "the-host"
        });
        assert.isOk(host); // untouched -- they weren't stale

        const session = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.isOk(session); // session survives a non-host going stale
      });

      it("ends the whole session when the host goes stale", async function () {
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: userId,
          createdAt: new Date()
        });
        await PresenceCollection.insertAsync({
          fileId,
          userId,
          name: "Host",
          updatedAt: staleDate(20000) // host went stale
        });
        await PresenceCollection.insertAsync({
          fileId,
          userId: "a-guest",
          name: "Guest",
          updatedAt: staleDate(1000) // this guest is still fresh
        });

        await cleanupStalePresence();

        const session = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.isUndefined(session); // ended

        const remaining = await PresenceCollection.find({
          fileId
        }).countAsync();
        assert.equal(remaining, 0); // endSession clears everyone, fresh or not
      });

      it("handles multiple files with stale docs independently in one pass", async function () {
        const otherFileId = "file-2";

        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: "host-a",
          createdAt: new Date()
        });
        await SessionsCollection.insertAsync({
          _id: otherFileId,
          hostId: "host-b",
          createdAt: new Date()
        });

        // file-1: only a stale non-host guest
        await PresenceCollection.insertAsync({
          fileId,
          userId: "host-a",
          name: "Host A",
          updatedAt: staleDate(1000)
        });
        await PresenceCollection.insertAsync({
          fileId,
          userId: "stale-guest",
          name: "Guest",
          updatedAt: staleDate(20000)
        });

        // file-2: the host itself goes stale
        await PresenceCollection.insertAsync({
          fileId: otherFileId,
          userId: "host-b",
          name: "Host B",
          updatedAt: staleDate(20000)
        });

        await cleanupStalePresence();

        // file-1: session survives, only the stale guest is gone
        const session1 = await SessionsCollection.findOneAsync({ _id: fileId });
        assert.isOk(session1);
        const guest1 = await PresenceCollection.findOneAsync({
          fileId,
          userId: "stale-guest"
        });
        assert.isUndefined(guest1);

        // file-2: session ended because the host went stale
        const session2 = await SessionsCollection.findOneAsync({
          _id: otherFileId
        });
        assert.isUndefined(session2);
      });

      it("does nothing when there are no stale docs at all", async function () {
        await PresenceCollection.insertAsync({
          fileId,
          userId,
          name: "Host",
          updatedAt: staleDate(1000)
        });

        await cleanupStalePresence();

        const presence = await PresenceCollection.findOneAsync({
          fileId,
          userId
        });
        assert.isOk(presence);
      });
    });
  });
}
