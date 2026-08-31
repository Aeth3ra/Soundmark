import { useEffect, useRef } from "react";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { SessionsCollection } from "../../api/sessions/sessionCollection";

/**
 * Tracks a file's collaborative session: who its host is, and whether the
 * session has ended (host left or went stale).
 */
export function useSession({ fileId, userId }) {
  const isSubLoading = useSubscribe("sessions.forFile", fileId);
  const hasSeenSessionRef = useRef(false);

  // useTracker reactively responds to SessionCollection changes automatically;
  // keep dependencies strictly to primitive values like fileId.
  const { session, isLoading } = useTracker(() => {
    if (!fileId) return { session: null, isLoading: true };

    const doc = SessionsCollection.findOne({ _id: fileId }) ?? null;
    return {
      session: doc,
      isLoading: isSubLoading()
    };
  }, [fileId]);

  useEffect(() => {
    if (session) {
      hasSeenSessionRef.current = true;
    }
  }, [session]);

  const sessionEnded = hasSeenSessionRef.current && !session && !isLoading;
  const isHost = !!(session && userId && session.hostId === userId);

  return { isHost, sessionEnded, isLoading };
}
