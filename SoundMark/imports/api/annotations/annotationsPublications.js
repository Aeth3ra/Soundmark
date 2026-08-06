import { Meteor } from "meteor/meteor";
import { AnnotationsCollection } from "./annotationsCollection";

Meteor.publish("annotations.forFile", (fileId) => {
  check(fileId, String);
  return AnnotationsCollection.find({ fileId });
});
