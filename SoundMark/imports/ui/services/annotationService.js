import { Meteor } from "meteor/meteor";

export async function deleteAnnotation(annotationId) {
  try {
    Meteor.call("annotations.delete", { annotationId });
  } catch (err) {
    console.error("Couldn't delete annotation", err);
  }
}
