import { useEffect, useRef } from "react";
import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { colourForId } from "../lib/userColour";
import { PresenceCollection } from "../../api/presences/presenceCollection";

const UPDATE_INTERVAL_MS = 250; // throttle how often we push our own position
const STALE_MS = 8000; // hide a cursor if it hasn't updated in this long

// Subscribes to everyone else's live playhead position for a file/workspace,
// and periodically pushes the local user's own position up to the server.
export function usePresence({ fileId, identity, position }) {
  const isLoading = useSubscribe("presence.forFile", fileId);
  const lastSentRef = useRef(0);

  const others = useTracker(() => {
    if (!identity) return [];
    const cutoff = new Date(Date.now() - STALE_MS);
    return PresenceCollection.find({
      fileId,
      userId: { $ne: identity.userId },
      updatedAt: { $gt: cutoff }
    })
      .fetch()
      .map((doc) => ({ ...doc, color: colourForId(doc.userId) }));
  }, [fileId, identity?.userId]);

  // Push our own position, throttled. Only fileId + position are sent -
  // the server derives userId/name from the authenticated session.
  useEffect(() => {
    if (!identity || !fileId || position == null) return;

    const now = Date.now();
    if (now - lastSentRef.current < UPDATE_INTERVAL_MS) return;
    lastSentRef.current = now;

    Meteor.callAsync("presence.update", { fileId, position }).catch((err) =>
      console.error("Couldn't update active user", err)
    );
  }, [fileId, identity, position]);

  // Best-effort cleanup when leaving the page/file
  useEffect(() => {
    if (!identity || !fileId) return;
    return () => {
      Meteor.callAsync("presence.leave", { fileId }).catch(() => {});
    };
  }, [fileId, identity?.userId]);

  return { others, isLoading };
}
