import { useEffect, useRef } from "react";

export const ModalDialog = ({ label, onClose, className = "", children }) => {
	const ref = useRef(null);

	useEffect(() => {
		const dialog = ref.current;
		if (dialog && !dialog.open) dialog.showModal();
	}, []);

	return (
		<dialog
			ref={ref}
			className="modal"
			aria-label={label}
			onCancel={(e) => {
				e.preventDefault(); // let the parent unmount us instead
				onClose();
			}}
		>
			<div className={`modal-box ${className}`}>{children}</div>
			<button
				type="button"
				className="modal-backdrop"
				aria-label="Close"
				onClick={onClose}
			>
				close
			</button>
		</dialog>
	);
};
