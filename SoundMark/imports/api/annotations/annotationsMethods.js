import { Meteor } from "meteor/meteor";

import { AnnotationsCollection } from "./annotationsCollection";
import { AudioCollection } from "../audio/audioCollection";

Meteor.methods({
  /**
  * Method to create an annotation for an audio file
  */
  async "annotations.create"({
    fileId,
    start,
    end,
    tags = [],
    comment = ""
  }) {

    const audioFile = await AudioCollection.findOneAsync(fileId);

    // Check file exists
    if (!audioFile) {
      throw new Meteor.Error(
        "audio-not-found",
        "The audio file does not exist."
      );
    }

    // Insert into Mongo
    return await AnnotationsCollection.insertAsync({
      fileId,
      start,
      end,
      tags: tags,
      comment: comment.trim(),
      createdBy: null, //Not implemented
      createdAt: new Date(),
      updatedAt: new Date()
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