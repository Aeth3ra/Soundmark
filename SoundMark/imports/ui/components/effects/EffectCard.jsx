import { useState } from "react";
import { Power, Trash2 } from "lucide-react";
import { updateEffect, deleteEffect } from "../../services/effectsService";
import { formatMs } from "../../utils/time";
import { describeEffect } from "../../lib/effectTypes";

const getErrorMessage = (err, fallback) =>
	err?.reason || err?.message || fallback;

export const EffectCard = ({
	effect,
	onSeek,
	userId,
	isHost,
	locallyMuted,
	onToggleLocalEffect,
	creatorName
}) => {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);

	const canEdit = Boolean(userId && (isHost || effect.createdBy === userId));
	const isCollaboratorEffect = Boolean(userId && effect.createdBy !== userId);
	const { title, details, needsRecreation } = describeEffect(
		effect.type,
		effect.params
	);

	/** Runs an async effect action with shared busy/error handling. */
	const runAction = async (action, fallbackMessage) => {
		if (!canEdit || busy) return;
		setBusy(true);
		setError(null);

		try {
			await action();
		} catch (err) {
			setError(getErrorMessage(err, fallbackMessage));
		} finally {
			setBusy(false);
		}
	};

	const handleToggle = () => {
		if (needsRecreation) return;
		runAction(
			// The Step 2 API requires all editable fields on every update.
			() =>
				updateEffect(effect._id, {
					start: effect.start,
					end: effect.end,
					params: effect.params,
					enabled: !effect.enabled,
					order: effect.order
				}),
			"Couldn't update the effect."
		);
	};

	const handleDelete = () =>
		runAction(() => deleteEffect(effect), "Couldn't delete the effect.");

	return (
		<div className="p-3 rounded-box border border-base-300/60 bg-base-100 shadow-sm">
			<div className="flex items-center justify-between gap-2">
				<h3 className="text-sm font-semibold">{title}</h3>
				<span
					className={`badge badge-sm ${effect.enabled ? "badge-primary" : "badge-ghost"}`}
				>
					{effect.enabled ? "Enabled" : "Disabled"}
				</span>
			</div>

			<button
				type="button"
				onClick={() => onSeek(effect.start)}
				className="text-xs font-mono text-primary hover:underline mt-2"
			>
				{formatMs(effect.start * 1000)} – {formatMs(effect.end * 1000)}
			</button>

			<p className="text-sm text-base-content/60 mt-1">{details}</p>
			<p className="text-xs text-base-content/50 mt-1">
				By {effect.createdBy === userId ? "you" : creatorName || "a collaborator"}
			</p>

			{isCollaboratorEffect && effect.enabled && (
				<button
					type="button"
					role="switch"
					aria-checked={!locallyMuted}
					aria-label={`Play ${title} by ${creatorName || "a collaborator"} in my playback`}
					onClick={() => onToggleLocalEffect(effect._id)}
					className={`btn btn-xs mt-3 ${locallyMuted ? "btn-outline" : "btn-primary"}`}
				>
					In my playback: {locallyMuted ? "Off" : "On"}
				</button>
			)}

			<div className="flex items-center gap-2 mt-3">
				{canEdit && (
					<button
						type="button"
						onClick={handleToggle}
						disabled={busy || needsRecreation}
						className="btn btn-outline btn-xs"
					>
						<Power className="h-3.5 w-3.5" aria-hidden="true" />
						{effect.enabled ? "Disable for everyone" : "Enable for everyone"}
					</button>
				)}
				{canEdit && (
					<button
						type="button"
						onClick={handleDelete}
						disabled={busy}
						className="btn btn-ghost btn-xs text-error"
					>
						<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
						Delete
					</button>
				)}
			</div>

			{error && (
				<p role="alert" className="text-error text-sm mt-2">
					{error}
				</p>
			)}
		</div>
	);
};
