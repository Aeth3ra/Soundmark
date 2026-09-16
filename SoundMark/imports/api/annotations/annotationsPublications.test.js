import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import { PublicationCollector } from "meteor/communitypackages:publication-collector";
import { AnnotationsCollection } from "./annotationsCollection";
import "./annotationsPublications";

if (Meteor.isServer) {
  describe("annotations.publications", function () {
    const fileId = "file-1";
    const otherFileId = "file-2";

    let userId;

    beforeEach(async function () {
        await AnnotationsCollection.removeAsync({});
        await Meteor.users.removeAsync({});

        userId = await Meteor.users.insertAsync({
        profile: { name: "Test User" }
        });
    });

    describe("annotations.forFile", function () {
      it("only publishes annotations for the requested file", async function () {
        await AnnotationsCollection.insertAsync({ fileId, title: "a" });
        await AnnotationsCollection.insertAsync({
          fileId: otherFileId,
          title: "b"
        });

        const collector = new PublicationCollector({ userId });
        // collect() resolves once the publish function calls this.ready()
        const collections = await collector.collect(
          "annotations.forFile",
          fileId
        );

        assert.equal(collections.annotations.length, 1);
        assert.equal(collections.annotations[0].fileId, fileId);
      });

      it("publishes an empty array (not undefined) when there's nothing to find", async function () {
        const collector = new PublicationCollector({ userId });
        const collections = await collector.collect(
          "annotations.forFile",
          fileId
        );

        // publication-collector normalises "no matching docs" to []
        assert.deepEqual(collections.annotations, []);
      });
    });

    describe("annotations.authorsForFile", function () {
      let alice;
      let bob;

      beforeEach(async function () {
        alice = await Meteor.users.insertAsync({ profile: { name: "Alice" } });
        bob = await Meteor.users.insertAsync({ profile: { name: "Bob" } });
      });

      it("publishes one users doc per distinct author on that file", async function () {
        // Two annotations from the same author, one from a different author
        await AnnotationsCollection.insertAsync({ fileId, createdBy: alice });
        await AnnotationsCollection.insertAsync({ fileId, createdBy: alice });
        await AnnotationsCollection.insertAsync({ fileId, createdBy: bob });

        const collector = new PublicationCollector({ userId });
        const collections = await collector.collect(
          "annotations.authorsForFile",
          fileId
        );

        assert.equal(collections.users.length, 2); // de-duplicated, not 3
        const names = collections.users.map((u) => u.profile.name).sort();
        assert.deepEqual(names, ["Alice", "Bob"]);
      });

      it("only publishes fields.'profile.name', not the whole user doc", async function () {
        await Meteor.users.updateAsync(alice, {
          $set: { emails: [{ address: "alice@example.com" }] }
        });
        await AnnotationsCollection.insertAsync({ fileId, createdBy: alice });

        const collector = new PublicationCollector({ userId });
        const collections = await collector.collect(
          "annotations.authorsForFile",
          fileId
        );

        const published = collections.users.find((u) => u._id === alice);
        assert.isUndefined(published.emails); // fields projection excludes it
      });

      it("does not publish authors whose annotations are on a different file", async function () {
        await AnnotationsCollection.insertAsync({
          fileId: otherFileId,
          createdBy: alice
        });
        const collector = new PublicationCollector({ userId });
        const collections = await collector.collect(
          "annotations.authorsForFile",
          fileId
        );

        assert.isUndefined(collections.users);
      });
    });
  });
}
