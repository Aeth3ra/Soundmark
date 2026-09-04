import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { AnnotationsCollection } from "./annotationsCollection";
import { publishComposite } from "meteor/reywood:publish-composite";

Meteor.publish("annotations.forFile", (fileId) => {
  check(fileId, String);

  const result = AnnotationsCollection.find({ fileId });

  return result;
});

/**
 * Publishes just the display names of everyone who has authored an
 * annotation on this file.
 *
 * This stays reactive: if a
 * brand-new author's annotation arrives while a client is subscribed,
 * their name gets published too, with no resubscribe needed. Ref-counted
 * so a user's doc is only unpublished once none of their annotations on
 * this file remain.
 */
publishComposite("annotations.authorsForFile", function (fileId) {
  check(fileId, String);

  return {
    find() {
      return AnnotationsCollection.find(
        { fileId },
        { fields: { createdBy: 1 } }
      );
    },
    children: [
      {
        find(annotation) {
          return Meteor.users.find(
            { _id: annotation.createdBy },
            { fields: { "profile.name": 1 } }
          );
        }
      }
    ]
  };
});
