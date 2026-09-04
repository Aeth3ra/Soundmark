import { Meteor } from "meteor/meteor";

export async function deleteAnnotation(annotation) {
  try {
    Meteor.callAsync("annotations.delete", annotation._id);
  } catch (err) {
    console.error("Couldn't delete annotation", err);
  }
}

export async function createAnnotation({
  fileId,
  title,
  colour,
  start,
  end,
  tags,
  comment
}) {
  try {
    await Meteor.callAsync("annotations.create", {
      fileId,
      title: title.trim(),
      colour,
      start,
      end,
      tags,
      comment
    });
  } catch (err) {
    console.error("Couldn't create annotation", err);
  }
}
