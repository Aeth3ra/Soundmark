import { useEffect, useRef } from "react";
import { useNotifications } from "../components/notifications/NotificationProvider";

export function usePresenceNotifications({
	fileId,
	others,
	ready,
	connected,
	sessionEnded,
	followingUserId,
	stopFollowing
}) {
	const { notify } = useNotifications();
	const baseline = useRef(null);
	const departures = useRef(new Map());
	const latest = useRef({ followingUserId, stopFollowing });

	useEffect(() => {
		latest.current = { followingUserId, stopFollowing };
	}, [followingUserId, stopFollowing]);

	useEffect(() => {
		const pending = departures.current;
		return () => {
			pending.forEach(clearTimeout);
			pending.clear();
			baseline.current = null;
		};
	}, [fileId]);

	useEffect(() => {
		const pending = departures.current;
		if (!ready || !connected || sessionEnded) {
			pending.forEach(clearTimeout);
			pending.clear();
			baseline.current = null;
			return;
		}
		const current = new Map(others.map((user) => [user.userId, user]));
		if (baseline.current) {
			current.forEach((user, id) => {
				if (pending.has(id)) {
					clearTimeout(pending.get(id));
					pending.delete(id);
				} else if (!baseline.current.has(id)) {
					notify({
						fileId,
						message: `${user.name || "A collaborator"} joined the workspace.`
					});
				}
			});
			baseline.current.forEach((user, id) => {
				if (current.has(id) || pending.has(id)) return;
				pending.set(
					id,
					setTimeout(() => {
						pending.delete(id);
						const following = latest.current.followingUserId === id;
						if (following) latest.current.stopFollowing();
						notify({
							fileId,
							message: `${user.name || "A collaborator"} left the workspace.${following ? " Playback sync stopped." : ""}`
						});
					}, 1500)
				);
			});
		}
		baseline.current = current;
	}, [fileId, others, ready, connected, sessionEnded, notify]);
}
