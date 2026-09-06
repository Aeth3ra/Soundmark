import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { AnnotationsCollection } from "./annotationsCollection";
import { AudioCollection } from "../audio/audioCollection";

Meteor.methods({
  /**
   * Method to create an annotation for an audio file
   */
  async "annotations.create"({
    fileId,
    title = "",
    colour = "",
    start,
    end = null,
    tags = [],
    comment = ""
  }) {
    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "Must be logged in.");
    }

    check(fileId, String);
    check(title, String);
    check(colour, String);
    check(start, Number);
    check(end, Match.Maybe(Number));
    check(tags, [String]);
    check(comment, String);

    const audioFile = await AudioCollection.findOneAsync(fileId);

    // Check file exists
    if (!audioFile) {
      throw new Meteor.Error(
        "audio-not-found",
        "The audio file does not exist."
      );
    }

    // Insert into Mongo. createdBy is always this.userId (the calling user's
    // account, guest or otherwise) — never trust a client-supplied id.
    // Display name is looked up from Meteor.users.profile.name at read time
    // rather than duplicated here.
    return await AnnotationsCollection.insertAsync({
      fileId,
      title: title.trim(),
      colour,
      start,
      end,
      tags,
      comment: comment.trim(),
      createdBy: this.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  },

  async "annotations.update"(annotationId, updates) {
    if (!this.userId) {
        throw new Meteor.Error("not-authorized", "Must be logged in.");
    }

    check(annotationId, String);

    check(updates, {
        title: String,
        colour: String,
        tags: [String],
        comment: String
    });

    const annotation =
        await AnnotationsCollection.findOneAsync(annotationId);

    if (!annotation) {
        throw new Meteor.Error(
        "annotation-not-found",
        "The annotation does not exist."
        );
    }

    await AnnotationsCollection.updateAsync(annotationId, {
        $set: {
        title: updates.title.trim(),
        colour: updates.colour,
        tags: updates.tags,
        comment: updates.comment.trim(),
        updatedAt: new Date()
        }
    });
    },

  /**
   * Method to delete an annotation
   */
  async "annotations.delete"(annotationId) {
    check(annotationId, String);

    const annotation = await AnnotationsCollection.findOneAsync(annotationId);

    if (!annotation) return;

    await AnnotationsCollection.removeAsync(annotationId);
  }
});
