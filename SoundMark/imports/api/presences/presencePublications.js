import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { PresenceCollection } from "./presenceCollection";

// Publishes every guest currently active in a given file/workspace, scoped
// strictly to that fileId
Meteor.publish("presence.forFile", function (fileId) {
  check(fileId, String);
  return PresenceCollection.find({ fileId });
});
