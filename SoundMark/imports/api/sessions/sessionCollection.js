import { Mongo } from "meteor/mongo";

// One doc per file: { _id: fileId, hostId, createdAt }.
// Using fileId as _id makes "first insert wins" an atomic way to assign
// the host - see presence.update in presenceMethods.js.
export const SessionsCollection = new Mongo.Collection("sessions");
