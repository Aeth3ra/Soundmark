import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import { AnnotationsCollection } from "./annotationsCollection";
import { AudioCollection } from "../audio/audioCollection";
import "./annotationsMethods";

if (Meteor.isServer) {
  describe("annotations.methods", function () {
    const userId = "testUser1";
    let audioFileId;

    // Runs before every `it` block below, giving each test a clean,
    // predictable starting state instead of leftover data from the
    // previous test.
    beforeEach(async function () {
      await AnnotationsCollection.removeAsync({});
      await AudioCollection.removeAsync({});
      audioFileId = await AudioCollection.insertAsync({ name: "test.mp3" });
    });

    describe("annotations.create", function () {
      it("throws not-authorized when no user is logged in", async function () {
        try {
          await Meteor.server.method_handlers["annotations.create"].apply(
            { userId: null },
            [{ fileId: audioFileId, start: 0 }]
          );
          // If we reach this line, the method didn't throw -- fail explicitly
          assert.fail("expected the method to throw");
        } catch (err) {
          assert.equal(err.error, "not-authorized");
        }
      });

      it("throws audio-not-found when the referenced file doesn't exist", async function () {
        try {
          await Meteor.server.method_handlers["annotations.create"].apply(
            { userId },
            [{ fileId: "does-not-exist", start: 0 }]
          );
          assert.fail("expected the method to throw");
        } catch (err) {
          assert.equal(err.error, "audio-not-found");
        }
      });

      it("inserts an annotation with trimmed fields and the caller's userId", async function () {
        const annotationId = await Meteor.server.method_handlers[
          "annotations.create"
        ].apply({ userId }, [
          {
            fileId: audioFileId,
            title: "  My title  ",
            colour: "red",
            start: 1.5,
            end: 3.2,
            tags: ["a", "b"],
            comment: "  a comment  "
          }
        ]);

        const annotation =
          await AnnotationsCollection.findOneAsync(annotationId);

        assert.isOk(annotation);
        assert.equal(annotation.title, "My title"); // .trim() applied
        assert.equal(annotation.comment, "a comment"); // .trim() applied
        assert.equal(annotation.createdBy, userId); // set from this.userId
        assert.equal(annotation.fileId, audioFileId);
        assert.deepEqual(annotation.tags, ["a", "b"]);
        assert.instanceOf(annotation.createdAt, Date);
        assert.instanceOf(annotation.updatedAt, Date);
      });

      it("always uses this.userId for createdBy, even if the client sends its own", async function () {
        // The method destructures a fixed set of named params, so a rogue
        // extra `createdBy` field in the client's call has nowhere to land --
        // this test documents and locks in that safety property.
        const annotationId = await Meteor.server.method_handlers[
          "annotations.create"
        ].apply({ userId }, [
          {
            fileId: audioFileId,
            start: 0,
            createdBy: "someone-else"
          }
        ]);

        const annotation =
          await AnnotationsCollection.findOneAsync(annotationId);
        assert.equal(annotation.createdBy, userId);
      });

      it("rejects invalid argument types via check()", async function () {
        try {
          await Meteor.server.method_handlers["annotations.create"].apply(
            { userId },
            [{ fileId: audioFileId, start: "not-a-number" }]
          );
          assert.fail("expected the method to throw");
        } catch (err) {
          assert.match(err.message, /Match failed/);
        }
      });
    });

    describe("annotations.delete", function () {
      it("removes an existing annotation", async function () {
        const annotationId = await AnnotationsCollection.insertAsync({
          fileId: audioFileId,
          title: "x",
          createdBy: userId,
          createdAt: new Date()
        });

        await Meteor.server.method_handlers["annotations.delete"].apply({}, [
          annotationId
        ]);

        const found = await AnnotationsCollection.findOneAsync(annotationId);
        assert.isUndefined(found);
      });

      it("does nothing (and does not throw) if the annotation doesn't exist", async function () {
        await Meteor.server.method_handlers["annotations.delete"].apply({}, [
          "does-not-exist"
        ]);
        // Reaching this line without an exception is the assertion.
      });

      // NOTE: this test documents current behaviour, not necessarily
      // desired behaviour -- see the explanation below the code.
      it("currently allows any user to delete any annotation (no owner check)", async function () {
        const annotationId = await AnnotationsCollection.insertAsync({
          fileId: audioFileId,
          title: "owned by someone else",
          createdBy: "original-owner",
          createdAt: new Date()
        });

        await Meteor.server.method_handlers["annotations.delete"].apply(
          { userId: "a-completely-different-user" },
          [annotationId]
        );

        const found = await AnnotationsCollection.findOneAsync(annotationId);
        assert.isUndefined(found);
      });
    });
  });
}
