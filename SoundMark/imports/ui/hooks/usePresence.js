import { useEffect, useRef } from "react";
import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { colourForId } from "../lib/userColour";
import { PresenceCollection } from "../../api/presences/presenceCollection";

const STALE_MS = 8000;

export function usePresence({ fileId, identity, position }) {
  const isLoading = useSubscribe("presence.forFile", fileId);

  // Use refs so the interval can read the latest values without restarting
  const positionRef = useRef(position);
  const lastSentRef = useRef(0);
  const lastPositionRef = useRef(-1);

  // Keep ref up to date without triggering useEffects
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const others = useTracker(() => {
    if (!identity?.userId) return [];
    const cutoff = new Date(Date.now() - STALE_MS);
    return PresenceCollection.find({
      fileId,
      userId: { $ne: identity.userId },
      updatedAt: { $gt: cutoff }
    })
      .fetch()
      .map((doc) => ({ ...doc, color: colourForId(doc.userId) }));
  }, [fileId, identity?.userId]);

  // Network Engine: Handles both fast movement updates and slow pause heartbeats
  useEffect(() => {
    if (!identity?.userId || !fileId) return;

    // Send initial presence immediately upon joining
    Meteor.callAsync("presence.update", {
      fileId,
      position: positionRef.current
    }).catch(() => {});
    lastSentRef.current = Date.now();

    const intervalId = setInterval(() => {
      const currentPos = positionRef.current;
      const now = Date.now();
      const posChanged = currentPos !== lastPositionRef.current;
      const timeSinceLastPing = now - lastSentRef.current;

      // Send update if position changed (throttled to 250ms) OR if paused for 5 seconds
      if (
        (posChanged && timeSinceLastPing >= 250) ||
        timeSinceLastPing >= 5000
      ) {
        lastSentRef.current = now;
        lastPositionRef.current = currentPos;

        Meteor.callAsync("presence.update", {
          fileId,
          position: currentPos
        }).catch(() => {});
      }
    }, 250); // Check 4 times a second

    // Cleanup
    return () => {
      clearInterval(intervalId);
      Meteor.callAsync("presence.leave", { fileId }).catch(() => {});
    };
  }, [fileId, identity?.userId]);

  return { others, isLoading };
}
