import { useState } from "react";
import { X } from "lucide-react";
import { createEffect } from "../../services/effectsService";
import { formatMs } from "../../utils/time";
import {
	EFFECT_TYPES,
	validateEffectParams,
	defaultFieldValues
} from "../../lib/effectTypes";
import { EffectField } from "./EffectField";

const isValidRegion = (region, duration) =>
	Boolean(region) &&
	Number.isFinite(region.start) &&
	Number.isFinite(region.end) &&
	Number.isFinite(duration) &&
	region.start >= 0 &&
	region.end > region.start &&
	region.end <= duration;

export const EffectForm = ({ fileId, region, duration, order, onClose }) => {
	const [type, setType] = useState("normalize");
	const [values, setValues] = useState(() => defaultFieldValues("normalize"));
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);

	const config = EFFECT_TYPES[type];

	const handleTypeChange = (nextType) => {
		setType(nextType);
		setValues(defaultFieldValues(nextType));
		setError(null);
	};

	const handleFieldChange = (name, value) => {
		setValues((prev) => ({ ...prev, [name]: value }));
		setError(null);
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (saving) return;

		if (!isValidRegion(region, duration)) {
			setError("Select a valid region within the audio first.");
			return;
		}

		let params;
		try {
			params = validateEffectParams(type, values);
		} catch (err) {
			setError(err.message);
			return;
		}

		setError(null);
		setSaving(true);

		try {
			await createEffect({
				fileId,
				type,
				start: region.start,
				end: region.end,
				params,
				enabled: true,
				order
			});
			onClose();
		} catch (err) {
			setError(
				err.reason ||
					err.message ||
					"Couldn't save the effect. Try again."
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<form
			role="dialog"
			aria-labelledby="effect-form-title"
			onSubmit={handleSubmit}
			noValidate
			style={{
				position: "fixed",
				top: "40%",
				left: "50%",
				transform: "translate(-50%, -50%)",
				zIndex: 50
			}}
			className="bg-base-100 rounded-2xl shadow-2xl p-6 w-104 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto flex flex-col gap-5 border border-base-300"
		>
			<div className="flex items-center justify-between pb-4 border-b border-base-300">
				<div>
					<h2 id="effect-form-title" className="font-semibold">
						New effect
					</h2>
					{region && (
						<p className="text-sm font-mono text-base-content/60">
							{formatMs(region.start * 1000)} –{" "}
							{formatMs(region.end * 1000)}
						</p>
					)}
				</div>
				<button
					type="button"
					onClick={onClose}
					disabled={saving}
					aria-label="Close effect form"
					className="btn btn-ghost btn-sm btn-circle"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor="effect-type" className="text-sm font-medium">
					Effect
				</label>
				<select
					id="effect-type"
					value={type}
					disabled={saving}
					onChange={(event) => handleTypeChange(event.target.value)}
					className="select select-bordered w-full"
				>
					{Object.entries(EFFECT_TYPES).map(([id, effectType]) => (
						<option key={id} value={id}>
							{effectType.label}
						</option>
					))}
				</select>
			</div>

			<div className="flex flex-col gap-5">
				{config.fields.map((field) => (
					<EffectField
						key={field.name}
						field={field}
						value={values[field.name] ?? ""}
						onChange={handleFieldChange}
						disabled={saving}
					/>
				))}
			</div>

			{error && (
				<p role="alert" className="text-error text-sm">
					{error}
				</p>
			)}

			<div className="flex justify-between">
				<button
					type="button"
					onClick={onClose}
					disabled={saving}
					className="btn btn-ghost"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={saving}
					className="btn btn-primary"
				>
					{saving ? "Saving..." : "Save effect"}
				</button>
			</div>
		</form>
	);
};
