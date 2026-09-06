import { useEffect, useState } from "react";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { loginAsGuest } from "../services/guestLogin";
import { getUser } from "../services/userService";

export function useGuestAccount() {
  const [loginError, setLoginError] = useState(null);
  const [settled, setSettled] = useState(false);

  const { userId, name, isLoggingIn } = useTracker(
    () => ({
      userId: Meteor.userId(),
      name: Meteor.user()?.profile?.name || null,
      isLoggingIn: Meteor.loggingIn()
    }),
    []
  );

  // Trigger guest login only if there's no user and no resume in progress
  useEffect(() => {
    if (userId || isLoggingIn) return;
    loginAsGuest().catch((err) => setLoginError(err));
  }, [userId, isLoggingIn]);

  // A round-trip to the server confirms the resumed session's data has
  // had a fair chance to arrive, without an arbitrary timeout.
  useEffect(() => {
    if (!userId) {
      setSettled(false);
      return;
    }
    let cancelled = false;
    getUser().finally(() => {
      if (!cancelled) setSettled(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    userId,
    name,
    isReady: settled,
    loginError
  };
}
