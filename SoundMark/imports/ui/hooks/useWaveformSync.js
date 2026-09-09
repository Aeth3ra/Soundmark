import { useEffect, useState, useCallback } from "react";

export const useWaveformSync = ({
  duration,
  otherUsers = [],
  followingUserId,
  setFollowingUserId,
  currentUserId,
  seekTo,
  play,
  pause,
  isPlaying
}) => {
  const [syncError, setSyncError] = useState(null);

  // Active user target object
  const targetUser = otherUsers.find((u) => u.userId === followingUserId);

  const followUser = useCallback(
    (userId) => {
      const target = otherUsers.find((u) => u.userId === userId);

      // BLOCK MUTUAL LOCK: Check if the user we want to follow is ALREADY following us
      if (target?.followingUserId === currentUserId) {
        setSyncError(
          `Cannot sync to ${target.name || "this user"} because they are already following you.`
        );
        return;
      }

      setSyncError(null);
      setFollowingUserId(userId);
    },
    [otherUsers, currentUserId, setFollowingUserId]
  );

  const stopFollowing = useCallback(() => {
    setSyncError(null);
    setFollowingUserId(null);
  }, [setFollowingUserId]);

  const toggleFollow = useCallback(
    (userId) => {
      if (followingUserId === userId) {
        stopFollowing();
      } else {
        followUser(userId);
      }
    },
    [followingUserId, followUser, stopFollowing]
  );

  // Auto-break lock if target turns around and follows us while active
  useEffect(() => {
    if (targetUser && targetUser.followingUserId === currentUserId) {
      stopFollowing();
      setSyncError(
        `Sync broken: ${targetUser.name || "User"} started following you.`
      );
    }
  }, [
    targetUser?.followingUserId,
    currentUserId,
    stopFollowing,
    targetUser?.name
  ]);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  // Sync state whenever the target user's position or playback state updates
  useEffect(() => {
    if (!targetUser || !duration || duration <= 0) return;

    // Sync position (prevent out-of-bounds ratios)
    const targetProgress = Math.min(
      Math.max(targetUser.position / duration, 0),
      1
    );
    seekTo(targetProgress);

    // Sync play/pause state
    if (targetUser.isPlaying && !isPlaying) {
      play();
    } else if (!targetUser.isPlaying && isPlaying) {
      pause();
    }
  }, [targetUser?.position, targetUser?.isPlaying, duration]);

  return {
    targetUser,
    syncError,
    clearSyncError,
    stopFollowing,
    toggleFollow
  };
};
