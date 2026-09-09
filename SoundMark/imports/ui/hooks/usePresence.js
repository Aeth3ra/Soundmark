import { useEffect, useRef } from "react";
import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { colourForId } from "../lib/userColour";
import { PresenceCollection } from "../../api/presences/presenceCollection";

const STALE_MS = 8000;

export function usePresence({
  fileId,
  identity,
  position,
  isPlaying = false,
  followingUserId = null
}) {
  const isLoading = useSubscribe("presence.forFile", fileId);

  // Use refs so the interval can read the latest values without restarting
  const positionRef = useRef(position);
  const isPlayingRef = useRef(isPlaying);
  const followingUserIdRef = useRef(followingUserId);

  const lastSentRef = useRef(0);
  const lastPositionRef = useRef(-1);
  const lastIsPlayingRef = useRef(isPlaying);
  const lastFollowingUserIdRef = useRef(followingUserId);

  // Keep ref up to date without triggering useEffects
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    followingUserIdRef.current = followingUserId;
  }, [followingUserId]);

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

    // Helper to dispatch update to Meteor
    const sendPresenceUpdate = () => {
      const now = Date.now();
      lastSentRef.current = now;
      lastPositionRef.current = positionRef.current;
      lastIsPlayingRef.current = isPlayingRef.current;
      lastFollowingUserIdRef.current = followingUserIdRef.current;

      Meteor.callAsync("presence.update", {
        fileId,
        position: positionRef.current,
        isPlaying: isPlayingRef.current,
        followingUserId: followingUserIdRef.current
      }).catch(() => {});
    };

    // Send initial presence immediately upon joining
    sendPresenceUpdate();

    const intervalId = setInterval(() => {
      const currentPos = positionRef.current;
      const currentIsPlaying = isPlayingRef.current;
      const currentFollowingId = followingUserIdRef.current;
      const now = Date.now();

      const posChanged = currentPos !== lastPositionRef.current;
      const playStateChanged = currentIsPlaying !== lastIsPlayingRef.current;
      const followTargetChanged =
        currentFollowingId !== lastFollowingUserIdRef.current;
      const timeSinceLastPing = now - lastSentRef.current;

      // Send update if position changed (throttled to 250ms) OR if paused for 5 seconds
      if (
        followTargetChanged ||
        playStateChanged ||
        (posChanged && timeSinceLastPing >= 250) ||
        timeSinceLastPing >= 5000
      ) {
        sendPresenceUpdate();
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
