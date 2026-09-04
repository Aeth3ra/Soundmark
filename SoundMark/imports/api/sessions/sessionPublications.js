import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { SessionsCollection } from "./sessionCollection";

Meteor.publish("sessions.forFile", function (fileId) {
  check(fileId, String);
  return SessionsCollection.find({ _id: fileId });
});
