import { useEffect, useRef } from "react";
import { useNotifications } from "../components/notifications/NotificationProvider";

export function useProcessingNotification({
	fileId,
	isProcessing,
	isAudioReady,
	audioError,
	audioVersion
}) {
	const { notify } = useNotifications();
	const started = useRef(null);
	useEffect(() => {
		started.current = null;
	}, [fileId]);
	useEffect(() => {
		if (isProcessing) {
			if (!started.current)
				started.current = { time: Date.now(), version: audioVersion };
			return;
		}
		const previous = started.current;
		started.current = null;
		if (
			previous &&
			isAudioReady &&
			!audioError &&
			audioVersion > previous.version &&
			Date.now() - previous.time >= 2000
		) {
			notify({
				fileId,
				type: "success",
				message: "Audio preview updated."
			});
		}
	}, [fileId, isProcessing, isAudioReady, audioError, audioVersion, notify]);
}
