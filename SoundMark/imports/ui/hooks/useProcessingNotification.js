import { useEffect, useRef } from "react";
import { useNotifications } from "../components/notifications/NotificationProvider";

/**
 * Displays a success notification when an audio effect re-render takes long enough
 * (>= 2s) that user feedback on completion is helpful.
 *
 * @param {object} params
 * @param {string} params.fileId - Target audio file ID.
 * @param {boolean} params.isProcessing - Processing state flag from WaveSurfer hook.
 * @param {boolean} params.isAudioReady - Whether preview buffer is ready.
 * @param {string|null} params.audioError - Audio error message, if any.
 * @param {number} params.audioVersion - Current preview render version.
 */
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
