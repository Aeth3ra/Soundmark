import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { AnnotationsCollection } from "./annotationsCollection";

Meteor.publish("annotations.forFile", (fileId) => {
  check(fileId, String);

  const result = AnnotationsCollection.find({ fileId });

  return result;
});
