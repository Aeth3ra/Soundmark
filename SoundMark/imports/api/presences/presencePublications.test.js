import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import { PublicationCollector } from "meteor/communitypackages:publication-collector";
import { PresenceCollection } from "./presenceCollection";
import "./presencePublications"; // side-effect import: registers the publication

if (Meteor.isServer) {
  describe("presence.publications", function () {
    const fileId = "file-1";
    const otherFileId = "file-2";

    let userId;

    beforeEach(async function () {
      await PresenceCollection.removeAsync({});

      userId = await Meteor.users.insertAsync({
      profile: { name: "Test User" }
      });
    });

    describe("presence.forFile", function () {
      it("only publishes presence docs for the requested file", async function () {
        await PresenceCollection.insertAsync({
          fileId,
          userId: "a",
          name: "A"
        });
        await PresenceCollection.insertAsync({
          fileId: otherFileId,
          userId: "b",
          name: "B"
        });

        const collector = new PublicationCollector({ userId });
        const collections = await collector.collect("presence.forFile", fileId);

        // NOTE: "presence" here is a guess at your Mongo.Collection's
        // publish-side name. If PresenceCollection was created with a
        // different collection name string, swap it in below.
        assert.equal(collections.presence.length, 1);
        assert.equal(collections.presence[0].userId, "a");
      });

      it("publishes an empty array when nobody is present in the file", async function () {
        const collector = new PublicationCollector({ userId });
        const collections = await collector.collect("presence.forFile", fileId);

        assert.deepEqual(collections.presence, []);
      });

      it("rejects a non-string fileId via check()", async function () {
        const collector = new PublicationCollector({ userId });
        try {
          await collector.collect("presence.forFile", 12345);
          assert.fail("expected the publication to throw");
        } catch (err) {
          assert.match(err.message, /Match error/);
        }
      });
    });
  });
}
