import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { PresenceCollection } from "./presenceCollection";

// If a user's doc hasn't been refreshed in this long, treat them as
// disconnected (covers closed tabs, crashes, lost connections - anything
// that skips a clean "activeUsers.leave" call).
const STALE_MS = 15000;

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

    await PresenceCollection.removeAsync({
      fileId: payload.fileId,
      userId: this.userId
    });
  }
});

// Best-effort cleanup for guests who disconnected without calling
// activeUsers.leave (closed tab, lost network, browser crash, etc.)
if (Meteor.isServer) {
  Meteor.setInterval(async () => {
    await PresenceCollection.removeAsync({
      updatedAt: { $lt: new Date(Date.now() - STALE_MS) }
    });
  }, STALE_MS);
}
