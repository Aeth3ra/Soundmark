import { Meteor } from "meteor/meteor";

export async function deleteAnnotation(annotation) {
  try {
    Meteor.call("annotations.delete", annotation._id);
  } catch (err) {
    console.error("Couldn't delete annotation", err);
  }
}
