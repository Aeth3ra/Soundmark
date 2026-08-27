import { useEffect, useState } from "react";
import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { loginAsGuest } from "../lib/guestLogin";

// Ensures every visitor has a real Meteor.users account (a guest account,
// via our own custom login handler) and exposes their id + display name.
export function useGuestAccount() {
  const [loginError, setLoginError] = useState(null);

  const { userId, name, isLoggingIn } = useTracker(
    () => ({
      userId: Meteor.userId(),
      name: Meteor.user()?.profile?.name || null,
      isLoggingIn: Meteor.loggingIn()
    }),
    []
  );

  useEffect(() => {
    if (userId || isLoggingIn) return;
    loginAsGuest().catch((err) => setLoginError(err));
  }, [userId, isLoggingIn]);

  return {
    userId,
    name,
    isReady: Boolean(userId),
    loginError
  };
}
