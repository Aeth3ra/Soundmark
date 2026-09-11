import { useEffect, useState, useCallback, useRef } from "react";

const DRIFT_SEEK_THRESHOLD_SEC = 0.75;
const CHECK_INTERVAL_MS = 300;

export const useWaveformSync = ({
  duration,
  otherUsers = [],
  followingUserId,
  setFollowingUserId,
  currentUserId,
  currentTime,
  seekTo,
  play,
  pause,
  isPlaying,
  playbackRate,
  setPlaybackRate
}) => {
  const [syncError, setSyncError] = useState(null);

  // Active user target object
  const targetUser = otherUsers.find((u) => u.userId === followingUserId);

  // Refs so the interval always reads fresh values without restarting
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const playbackRateRef = useRef(playbackRate);
  const targetUserRef = useRef(targetUser);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    targetUserRef.current = targetUser;
  }, [targetUser]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  const followUser = useCallback(
    (userId) => {
      const target = otherUsers.find((u) => u.userId === userId);

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

  // Snap to the target's position the moment we start following someone.
  useEffect(() => {
    if (!followingUserId) return;
    const target = targetUserRef.current;
    if (!target || !duration || duration <= 0) return;

    if (
      target.playbackRate &&
      target.playbackRate !== playbackRateRef.current
    ) {
      setPlaybackRate(target.playbackRate);
    }

    const estimated = estimateTargetPosition(target);
    seekTo(Math.min(Math.max(estimated / duration, 0), 1));
    // Intentionally only re-run when the follow target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followingUserId]);

  // While following, poll periodically: sync play/pause immediately but only hard-seek if drift has grown past the
  // threshold. Small drift is left alone so playback stays smooth.
  useEffect(() => {
    if (!followingUserId) return;

    const intervalId = setInterval(() => {
      const target = targetUserRef.current;
      if (!target || !duration || duration <= 0) return;

      if (target.isPlaying && !isPlayingRef.current) {
        play();
      } else if (!target.isPlaying && isPlayingRef.current) {
        pause();
      }

      if (
        target.playbackRate &&
        target.playbackRate !== playbackRateRef.current
      ) {
        setPlaybackRate(target.playbackRate);
      }

      const estimatedTargetPosition = estimateTargetPosition(target);
      const drift = Math.abs(currentTimeRef.current - estimatedTargetPosition);

      if (drift > DRIFT_SEEK_THRESHOLD_SEC) {
        const targetProgress = Math.min(
          Math.max(estimatedTargetPosition / duration, 0),
          1
        );
        seekTo(targetProgress);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [followingUserId, duration, seekTo, play, pause]);

  return {
    targetUser,
    syncError,
    clearSyncError,
    stopFollowing,
    toggleFollow
  };
};

function estimateTargetPosition(target) {
  if (!target) return null;
  const rate = target.isPlaying ? (target.playbackRate ?? 1) : 0;
  const elapsedSec = target.updatedAt
    ? Math.max(0, (Date.now() - new Date(target.updatedAt).getTime()) / 1000)
    : 0;
  return target.position + elapsedSec * rate;
}
