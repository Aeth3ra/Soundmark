import { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

export const ToastError = ({
	message,
	onClose,
	autoDismissMs = 5000
}) => {
	useEffect(() => {
		if (!message || !autoDismissMs || !onClose) return;

		const timer = window.setTimeout(onClose, autoDismissMs);

		return () => window.clearTimeout(timer);
	}, [message, onClose, autoDismissMs]);

	if (!message) return null;

	return (
		<div className="toast toast-top toast-center z-50">
			<div
				role="alert"
				className="alert alert-error shadow-lg gap-3"
			>
				<AlertCircle className="h-4 w-4 shrink-0" />

				<span>{message}</span>

				<button
					type="button"
					onClick={onClose}
					className="btn btn-ghost btn-xs btn-circle"
					aria-label="Close notification"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	);
};