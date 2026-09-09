import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { PresenceCollection } from "./presenceCollection";
import { SessionsCollection } from "../sessions/sessionCollection";
import {
  createSessionIfNeeded,
  isHost,
  endSession
} from "../sessions/sessionMethods";

// If a user's doc hasn't been refreshed in this long, treat them as
// disconnected (covers closed tabs, crashes, lost connections - anything
// that skips a clean "activeUsers.leave" call).
const STALE_MS = 15000;

Meteor.methods({
  /**
   * Upserts the calling guest's live position for a given file/workspace.
   * userId/name come from the authenticated session
   */
  async "presence.update"({ fileId, position, isPlaying, followingUserId }) {
    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "Must be logged in.");
    }

    check(fileId, String);
    check(position, Number);
    check(isPlaying, Match.Optional(Boolean));
    check(followingUserId, Match.Maybe(Match.OneOf(String, null)));

    const user = await Meteor.users.findOneAsync(this.userId);
    const name = user?.profile?.name || "Guest";

    const existingSession = await SessionsCollection.findOneAsync({
      _id: fileId
    });
    const existingPresencesCount = await PresenceCollection.find({
      fileId
    }).countAsync();

    // Only allow creating a session if ZERO presences exist (brand new room creation).
    // If the session was deleted by the host but other users are still being kicked
    // out, reject the update so they don't recreate the session or claim host status.
    if (!existingSession) {
      if (existingPresencesCount > 0) return;
      await createSessionIfNeeded(fileId, this.userId);
    }

    await PresenceCollection.upsertAsync(
      { fileId, userId: this.userId },
      {
        $set: {
          name,
          position,
          isPlaying: Boolean(isPlaying),
          followingUserId: followingUserId || null,
          updatedAt: new Date()
        }
      }
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

    if (await isHost(fileId, this.userId)) {
      await endSession(fileId);
      return;
    }

    await PresenceCollection.removeAsync({ fileId, userId: this.userId });
  }
});

/**
 * Best-effort cleanup for guests (including hosts) who disconnected
 * without a clean "presence.leave" call.
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
    const staleUserIds = docs.map((d) => d.userId);
    const hostWentStale = (
      await Promise.all(staleUserIds.map((uid) => isHost(fileId, uid)))
    ).some(Boolean);

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
