import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { EffectsCollection } from "./effectsCollection";

Meteor.publish("effects.forFile", function (fileId) {
  check(fileId, String);

  if (!this.userId) {
    return this.ready();
  }

  return EffectsCollection.find({ fileId });
});