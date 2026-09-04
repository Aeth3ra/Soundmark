import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { PresenceCollection } from "./presenceCollection";
import { SessionsCollection } from "../sessions/sessionCollection";
import { deleteAudioFile } from "../audio/audioMethods";
// If a user's doc hasn't been refreshed in this long, treat them as
// disconnected (covers closed tabs, crashes, lost connections - anything
// that skips a clean "activeUsers.leave" call).
const STALE_MS = 15000;

// Mongo's duplicate-key error code, thrown when SessionsCollection.insertAsync
// is called with an _id (fileId) that already has a session doc.
const DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * Ends a file's collaborative session entirely: removes the session record,
 * everyone's presence doc for that file, and the audio file itself. Only
 * ever called once we've established the departing/expired user was the
 * host.
 */
async function endSession(fileId) {
  await SessionsCollection.removeAsync({ _id: fileId });
  await PresenceCollection.removeAsync({ fileId });
  await deleteAudioFile(fileId);
}

Meteor.methods({
  /**
   * Upserts the calling guest's live position for a given file/workspace.
   * userId/name come from the authenticated session
   */
  async "presence.update"(payload) {
    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "Must be logged in.");
    }

    check(payload, {
      fileId: String,
      position: Number
    });

    const { fileId, position } = payload;
    const user = await Meteor.users.findOneAsync(this.userId);
    const name = user?.profile?.name || "Guest";

    // 1. Fetch existing session & presences for this file
    const existingSession = await SessionsCollection.findOneAsync({
      _id: fileId
    });
    const existingPresencesCount = await PresenceCollection.find({
      fileId
    }).countAsync();

    // 2. Only allow creating a session if ZERO presences exist (brand new room creation)
    if (!existingSession) {
      if (existingPresencesCount > 0) {
        // Session was deleted by the host, but other users are still in the process of being kicked out.
        // Reject the update so they don't recreate the session or claim host status.
        return;
      }

      try {
        await SessionsCollection.insertAsync({
          _id: fileId,
          hostId: this.userId,
          createdAt: new Date()
        });
      } catch (err) {
        if (err.code !== DUPLICATE_KEY_ERROR_CODE) throw err;
      }
    }

    await PresenceCollection.upsertAsync(
      { fileId, userId: this.userId },
      { $set: { name, position, updatedAt: new Date() } }
    );
  },

  /**
   * Removes the calling guest's doc for a file. Best-effort - call on
   * unmount/navigation, but don't rely on it alone (see STALE_MS cleanup).
   */
  async "presence.leave"(payload) {
    if (!this.userId) return;

    check(payload, { fileId: String });

    const { fileId } = payload;

    const session = await SessionsCollection.findOneAsync({
      _id: fileId
    });

    if (session?.hostId === this.userId) {
      await endSession(fileId);
      return;
    }
    await PresenceCollection.removeAsync({
      fileId,
      userId: this.userId
    });
  }
});
/**
 * Best-effort cleanup for guests (including hosts) who disconnected
 *
 */
export async function cleanupStalePresence() {
  const cutoff = new Date(Date.now() - STALE_MS);
  const staleDocs = await PresenceCollection.find({
    updatedAt: { $lt: cutoff }
  }).fetchAsync();

  if (staleDocs.length === 0) return;

  const staleByFile = new Map();
  staleDocs.forEach((doc) => {
    if (!staleByFile.has(doc.fileId)) staleByFile.set(doc.fileId, []);
    staleByFile.get(doc.fileId).push(doc);
  });

  for (const [fileId, docs] of staleByFile) {
    const session = await SessionsCollection.findOneAsync({ _id: fileId });
    const hostWentStale = docs.some((d) => d.userId === session?.hostId);

    if (hostWentStale) {
      await endSession(fileId);
    } else {
      await PresenceCollection.removeAsync({
        _id: { $in: docs.map((d) => d._id) }
      });
    }
  }
}
if (Meteor.isServer) {
  Meteor.setInterval(cleanupStalePresence, STALE_MS);
}
