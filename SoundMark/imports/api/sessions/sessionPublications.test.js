import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import { PublicationCollector } from "meteor/communitypackages:publication-collector";
import { SessionsCollection } from "./sessionCollection";
import "./sessionPublications";

if (Meteor.isServer) {
  describe("sessions.publications", function () {
    const fileId = "file-1";
    const otherFileId = "file-2";
    const hostId = "host-user-1";

    beforeEach(async function () {
      await SessionsCollection.removeAsync({});
    });

    describe("sessions.forFile", function () {
      it("only publishes the session for the requested file", async function () {
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId,
          createdAt: new Date()
        });
        await SessionsCollection.insertAsync({
          _id: otherFileId,
          hostId: "host-user-2",
          createdAt: new Date()
        });

        const collector = new PublicationCollector({});
        const collections = await collector.collect("sessions.forFile", fileId);

        assert.equal(collections.sessions.length, 1);
        assert.equal(collections.sessions[0]._id, fileId);
        assert.equal(collections.sessions[0].hostId, hostId);
      });

      it("publishes an empty array (not undefined) when there's nothing to find", async function () {
        const collector = new PublicationCollector({});
        const collections = await collector.collect("sessions.forFile", fileId);

        assert.deepEqual(collections.sessions, []);
      });
    });
  });
}
