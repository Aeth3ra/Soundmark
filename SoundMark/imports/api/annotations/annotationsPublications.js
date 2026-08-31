import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { AnnotationsCollection } from "./annotationsCollection";

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
Meteor.publish("annotations.authorsForFile", async function (fileId) {
  check(fileId, String);

  const self = this;
  const annotationAuthors = new Map(); // annotationId -> createdBy
  const userObservers = new Map(); // userId -> Promise<{ handle, refCount }>

  async function retainUser(userId) {
    if (!userId) return;

    // If we are already setting up (or have set up) this user, wait for the Promise
    if (userObservers.has(userId)) {
      const existing = await userObservers.get(userId);
      existing.refCount += 1;
      return;
    }

    // Wrap the setup in an async Promise so we can store it in the Map immediately.
    // This prevents race conditions if `retainUser` is called twice rapidly.
    const setupPromise = (async () => {
      const handle = await Meteor.users
        .find({ _id: userId }, { fields: { "profile.name": 1 } })
        .observeChangesAsync({
          // <-- Use observeChangesAsync for Meteor 3
          added(id, fields) {
            self.added("users", id, fields);
          },
          changed(id, fields) {
            self.changed("users", id, fields);
          }
        });
      return { handle, refCount: 1 };
    })();

    userObservers.set(userId, setupPromise);
  }

  async function releaseUser(userId) {
    if (!userId || !userObservers.has(userId)) return;

    const existing = await userObservers.get(userId);
    existing.refCount -= 1;

    if (existing.refCount <= 0) {
      existing.handle.stop();
      userObservers.delete(userId);
      self.removed("users", userId);
    }
  }

  // Await the observeChangesAsync call
  const annotationsHandle = await AnnotationsCollection.find(
    { fileId },
    { fields: { createdBy: 1 } }
  ).observeChangesAsync({
    // Make callbacks async so they can await the retain/release functions
    async added(id, fields) {
      annotationAuthors.set(id, fields.createdBy);
      await retainUser(fields.createdBy);
    },
    async changed(id, fields) {
      if (!("createdBy" in fields)) return;
      const previousAuthor = annotationAuthors.get(id);
      if (previousAuthor === fields.createdBy) return;

      await releaseUser(previousAuthor);
      annotationAuthors.set(id, fields.createdBy);
      await retainUser(fields.createdBy);
    },
    async removed(id) {
      const previousAuthor = annotationAuthors.get(id);
      annotationAuthors.delete(id);
      await releaseUser(previousAuthor);
    }
  });

  self.ready();

  self.onStop(async () => {
    annotationsHandle.stop();
    // Safely stop all user observers by awaiting their setup promises
    for (const promise of userObservers.values()) {
      const { handle } = await promise;
      handle.stop();
    }
  });
});
