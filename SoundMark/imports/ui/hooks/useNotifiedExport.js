import { useCallback, useEffect, useRef, useState } from "react";
import { useNotifications } from "../components/notifications/NotificationProvider";

// Each run closes over its original arguments. Retrying never reads a newer selection.
export function useNotifiedExport(fileId) {
	const { notify, update } = useNotifications();
	const running = useRef(false);
	const active = useRef(false);
	const generation = useRef(0);
	const [operation, setOperation] = useState(null);
	const mode = operation?.fileId === fileId ? operation.mode : null;
	useEffect(() => {
		active.current = true;
		generation.current++;
		running.current = false;
		// Clear the old page operation when React reuses this component for another file.
		setOperation(null);
		return () => {
			active.current = false;
			generation.current++;
		};
	}, [fileId]);

	const run = useCallback(
		async function execute(
			{ mode: exportMode = "export", action, pending, errorMessage },
			retryId
		) {
			if (!active.current || running.current) return;
			running.current = true;
			const runGeneration = generation.current;
			const isActive = () =>
				active.current && generation.current === runGeneration;
			setOperation({ fileId, mode: exportMode });
			const id = notify({
				id: retryId,
				fileId,
				type: "pending",
				message: pending,
				action: undefined
			});
			try {
				await action();
				update(id, {
					type: "success",
					message: "Export ready—download started.",
					action: undefined
				});
			} catch {
				update(id, {
					type: "error",
					message: errorMessage,
					action: isActive()
						? {
								label: "Retry",
								onClick: () => {
									if (isActive())
										return execute(
											{
												mode: exportMode,
												action,
												pending,
												errorMessage
											},
											id
										);
								}
							}
						: undefined
				});
			} finally {
				if (isActive()) {
					running.current = false;
					setOperation(null);
				}
			}
		},
		[fileId, notify, update]
	);
	return { run, mode, isExporting: mode !== null };
}
