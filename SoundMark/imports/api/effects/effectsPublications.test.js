import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import { PublicationCollector } from "meteor/communitypackages:publication-collector";
import { EffectsCollection } from "./effectsCollection";
import "./effectsPublications";

if (Meteor.isServer) {
  describe("effects.publications", function () {
    const fileId = "file-1";
    const otherFileId = "file-2";
    let userId;

    beforeEach(async function () {
      await EffectsCollection.removeAsync({});
      await Meteor.users.removeAsync({});
      userId = await Meteor.users.insertAsync({
        profile: { name: "Test User" }
      });
    });

    describe("effects.forFile", function () {
      it("only publishes effects for the requested file", async function () {
        const effectId = await EffectsCollection.insertAsync({
          fileId, type: "normalize"
        });
        await EffectsCollection.insertAsync({
          fileId: otherFileId, type: "amplify"
        });

        const collector = new PublicationCollector({ userId });
        const collections = await collector.collect("effects.forFile", fileId);

        assert.lengthOf(collections.effects, 1);
        assert.equal(collections.effects[0]._id, effectId);
        assert.equal(collections.effects[0].fileId, fileId);
      });

      it("publishes enabled and disabled effects from other creators with their settings", async function () {
        const effect = {
          fileId,
          type: "filter",
          start: 1,
          end: 4,
          params: { filterType: "highpass", frequency: 500 },
          enabled: false,
          order: 2,
          createdBy: "another-user",
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const disabledId = await EffectsCollection.insertAsync(effect);
        const enabledId = await EffectsCollection.insertAsync({
          ...effect, enabled: true, order: 3
        });

        const collector = new PublicationCollector({ userId });
        const collections = await collector.collect("effects.forFile", fileId);

        assert.sameMembers(
          collections.effects.map((doc) => doc._id),
          [disabledId, enabledId]
        );
        assert.deepEqual(
          collections.effects.find((doc) => doc._id === disabledId),
          { ...effect, _id: disabledId }
        );
      });

      it("publishes an empty array when the file has no effects", async function () {
        const collector = new PublicationCollector({ userId });
        const collections = await collector.collect("effects.forFile", fileId);

        assert.deepEqual(collections.effects, []);
      });

      it("does not publish effects when no user is logged in", async function () {
        await EffectsCollection.insertAsync({
            fileId,
            type: "normalize"
        });

        const collector = new PublicationCollector();
        const collections = await collector.collect("effects.forFile", fileId);

        assert.isUndefined(collections.effects);
      });

      it("rejects a non-string fileId via check()", async function () {
        const collector = new PublicationCollector({ userId });

        try {
          await collector.collect("effects.forFile", 12345);
          assert.fail("expected the publication to throw");
        } catch (err) {
          assert.match(err.message, /Match error/);
        }
      });
    });
  });
}