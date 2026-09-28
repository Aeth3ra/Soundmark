import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { useGuestAccount } from "../hooks/useGuestAccount";
import { setDisplayName } from "../services/userService";

/**
 * Shows the user's name; click to edit it in place.
 * Enter saves, Escape cancels.
 */
export const EditableName = () => {
	const { name } = useGuestAccount();
	const [draft, setDraft] = useState(null); // null = not editing
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);

	const trimmed = draft?.trim() ?? "";

	const cancel = () => {
		setDraft(null);
		setError(null);
	};

	const save = async () => {
		if (!trimmed || saving) return;
		if (trimmed === name) return cancel(); // nothing changed

		setSaving(true);
		setError(null);
		try {
			await setDisplayName(trimmed);
			setDraft(null);
		} catch (err) {
			setError(err.message);
		} finally {
			setSaving(false);
		}
	};

	if (draft === null) {
		return (
			<button
				type="button"
				onClick={() => setDraft(name ?? "")}
				aria-label="Edit your name"
				className="inline-flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-base-200"
			>
				{name || "Guest"}
				<Pencil className="h-3.5 w-3.5 text-base-content/50" />
			</button>
		);
	}

	return (
		<div className="flex flex-col items-center gap-1">
			<div className="flex items-center gap-1">
				<input
					type="text"
					autoFocus
					aria-label="Your name"
					value={draft}
					maxLength={30}
					disabled={saving}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") save();
						if (e.key === "Escape") cancel();
					}}
					className="w-44 rounded-lg bg-base-200 px-2 py-1 text-center outline-none ring-1 ring-base-300 transition focus:ring-2 focus:ring-primary"
				/>
				<button
					type="button"
					onClick={save}
					disabled={!trimmed || saving}
					aria-label="Save name"
					className="btn btn-primary btn-sm btn-square"
				>
					{saving ? (
						<span className="loading loading-spinner loading-xs" />
					) : (
						<Check className="h-4 w-4" />
					)}
				</button>
				<button
					type="button"
					onClick={cancel}
					disabled={saving}
					aria-label="Cancel"
					className="btn btn-ghost btn-sm btn-square"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
			{error && (
				<p role="alert" className="text-error text-xs font-normal">
					{error}
				</p>
			)}
		</div>
	);
};
