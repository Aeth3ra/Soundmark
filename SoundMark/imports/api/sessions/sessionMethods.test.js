import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";

import { createSessionIfNeeded, isHost, endSession } from "./sessionMethods";

import { SessionsCollection } from "./sessionCollection";
import { PresenceCollection } from "../presences/presenceCollection";
import { AudioCollection } from "../audio/audioCollection";
import * as R2 from "../audio/r2";

if (Meteor.isServer) {
  describe("sessionMethods", function () {
    let sendStub;

    beforeEach(async function () {
      await SessionsCollection.removeAsync({});
      await PresenceCollection.removeAsync({});
      await AudioCollection.removeAsync({});

      sendStub = sinon.stub(R2.r2Client, "send").resolves({});
    });

    afterEach(function () {
      sinon.restore();
    });

    describe("createSessionIfNeeded", function () {
      it("creates a session when one does not already exist", async function () {
        const fileId = "file-123";
        const hostId = "user-123";

        await createSessionIfNeeded(fileId, hostId);

        const session = await SessionsCollection.findOneAsync({
          _id: fileId
        });

        assert.exists(session);
        assert.equal(session._id, fileId);
        assert.equal(session.hostId, hostId);
        assert.instanceOf(session.createdAt, Date);
      });

      it("does not throw when the session already exists", async function () {
        const fileId = "file-123";
        const hostId = "user-123";

        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId,
          createdAt: new Date()
        });

        await createSessionIfNeeded(fileId, "different-user");

        const sessions = await SessionsCollection.find({
          _id: fileId
        }).fetchAsync();

        assert.lengthOf(sessions, 1);
        assert.equal(sessions[0].hostId, hostId);
      });

      it("rethrows errors other than duplicate-key errors", async function () {
        const originalError = new Error("Database error");

        const insertStub = sinon
          .stub(SessionsCollection, "insertAsync")
          .rejects(originalError);

        try {
          await createSessionIfNeeded("file-123", "user-123");
          assert.fail("Expected createSessionIfNeeded to throw");
        } catch (err) {
          assert.equal(err, originalError);
        }

        assert.isTrue(insertStub.calledOnce);
      });
    });

    describe("isHost", function () {
      it("returns true when the user is the host", async function () {
        const fileId = "file-123";
        const hostId = "user-123";

        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId,
          createdAt: new Date()
        });

        const result = await isHost(fileId, hostId);

        assert.isTrue(result);
      });

      it("returns false when the user is not the host", async function () {
        const fileId = "file-123";

        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: "user-123",
          createdAt: new Date()
        });

        const result = await isHost(fileId, "user-456");

        assert.isFalse(result);
      });

      it("returns false when the session does not exist", async function () {
        const result = await isHost("non-existent-file", "user-123");

        assert.isFalse(result);
      });
    });

    describe("endSession", function () {
      it("removes the session, presence records, and audio file", async function () {
        const fileId = "file-123";

        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: "user-123",
          createdAt: new Date()
        });

        await PresenceCollection.insertAsync({
          fileId,
          userId: "user-123"
        });

        await AudioCollection.insertAsync({
          _id: fileId,
          key: "audio/test-file.mp3",
          fileName: "test-file.mp3"
        });

        await endSession(fileId);

        const session = await SessionsCollection.findOneAsync({
          _id: fileId
        });

        const presence = await PresenceCollection.findOneAsync({
          fileId
        });

        const audio = await AudioCollection.findOneAsync({
          _id: fileId
        });

        assert.isUndefined(session);
        assert.isUndefined(presence);
        assert.isUndefined(audio);

        assert.isTrue(sendStub.calledOnce);
      });

      it("only removes presence records belonging to the specified file", async function () {
        const fileId = "file-123";
        const otherFileId = "file-456";

        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: "user-123",
          createdAt: new Date()
        });

        await PresenceCollection.insertAsync({
          fileId,
          userId: "user-123"
        });

        await PresenceCollection.insertAsync({
          fileId: otherFileId,
          userId: "user-456"
        });

        // Add an audio record so deleteAudioFile() runs normally.
        await AudioCollection.insertAsync({
          _id: fileId,
          key: "audio/test-file.mp3",
          fileName: "test-file.mp3"
        });

        await endSession(fileId);

        const deletedFilePresence = await PresenceCollection.findOneAsync({
          fileId
        });

        const otherFilePresence = await PresenceCollection.findOneAsync({
          fileId: otherFileId
        });

        assert.isUndefined(deletedFilePresence);
        assert.exists(otherFilePresence);
      });
    });
  });
}
