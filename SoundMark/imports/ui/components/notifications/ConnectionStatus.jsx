import { useEffect, useRef, useState } from "react";
import { useConnectionStatus } from "../../hooks/useConnectionStatus";
import { useNotifications } from "./NotificationProvider";

export function ConnectionStatus() {
	const connected = useConnectionStatus();
	const { notify } = useNotifications();
	const seenConnection = useRef(false);
	const [showWarning, setShowWarning] = useState(false);
	useEffect(() => {
		if (connected) {
			seenConnection.current = true;
			if (showWarning) {
				setShowWarning(false);
				notify({
					id: "connection-restored",
					type: "success",
					message: "Connected."
				});
			}
			return;
		}
		if (!seenConnection.current) return;
		const timer = setTimeout(() => setShowWarning(true), 2000);
		return () => clearTimeout(timer);
	}, [connected, showWarning, notify]);
	return showWarning && !connected ? (
		<div
			role="status"
			className="alert alert-warning rounded-none py-2 text-sm relative z-40"
		>
			Connection lost—reconnecting…
		</div>
	) : null;
}
