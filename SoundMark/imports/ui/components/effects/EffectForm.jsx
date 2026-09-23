import { useState } from "react";
import { X } from "lucide-react";
import { createEffect } from "../../services/effectsService";
import { formatMs } from "../../utils/time";

export const EffectForm = ({ fileId, region, duration, order, onClose }) => {
	const [type, setType] = useState("normalize");
	const [targetRms, setTargetRms] = useState("0.1");
	const [gain, setGain] = useState("1.5");
	const [semitones, setSemitones] = useState("0");
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (saving) return;

		if (
			!region ||
			!Number.isFinite(region.start) ||
			!Number.isFinite(region.end) ||
			!Number.isFinite(duration) ||
			region.start < 0 ||
			region.end <= region.start ||
			region.end > duration
		) {
			setError("Select a valid region within the audio first.");
			return;
		}

		let params;

		if (type === "normalize") {
			const target = Number(targetRms);

			if (targetRms.trim() === "" || !Number.isFinite(target) || target <= 0 || target > 1) {
				setError("Enter a target RMS greater than 0 and at most 1.");
				return;
			}

			params = {
				mode: "rms",
				targetRms: target,
			};
		} else if (type === "amplify") {
			const multiplier = Number(gain);

			if (
				gain.trim() === "" ||
				!Number.isFinite(multiplier) ||
				multiplier < 0 ||
				multiplier > 4
			) {
				setError("Enter an amplification gain between 0 and 4.");
				return;
			}

			params = {
				gain: multiplier,
			};
		} else if (type === "pitchShift") {
			const shift = Number(semitones);

			if (semitones.trim() === "" || !Number.isInteger(shift) || shift < -24 || shift > 24) {
				setError("Enter a pitch/key shift between -24 and +24 semitones.");
				return;
			}

			params = {
				semitones: shift,
			};
		} else {
			setError("Choose a supported effect type.");
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
				order,
			});
			onClose();
		} catch (err) {
			setError(err.reason || err.message || "Couldn't save the effect. Try again.");
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
				zIndex: 50,
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
							{formatMs(region.start * 1000)} – {formatMs(region.end * 1000)}
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
					onChange={(event) => {
						setType(event.target.value);
						setError(null);
					}}
					className="select select-bordered w-full"
				>
					<option value="normalize">RMS normalisation</option>
					<option value="amplify">Region amplification</option>
					<option value="pitchShift">Pitch / key shift</option>
				</select>
			</div>

			{type === "normalize" ? (
				<div className="flex flex-col gap-2">
					<label htmlFor="effect-target" className="text-sm font-medium">
						Target RMS
					</label>

					<input
						id="effect-target"
						type="number"
						min="0"
						max="1"
						step="any"
						required
						value={targetRms}
						disabled={saving}
						onChange={(event) => setTargetRms(event.target.value)}
						className="input input-bordered w-full"
					/>
				</div>
			) : type === "amplify" ? (
				<div className="flex flex-col gap-2">
					<label htmlFor="effect-gain" className="text-sm font-medium">
						Gain multiplier
					</label>

					<input
						id="effect-gain"
						type="number"
						min="0"
						max="4"
						step="any"
						required
						value={gain}
						disabled={saving}
						onChange={(event) => setGain(event.target.value)}
						aria-describedby="effect-gain-help"
						className="input input-bordered w-full"
					/>

					<p id="effect-gain-help" className="text-xs text-base-content/60">
						1× leaves the level unchanged; 2× doubles the amplitude; 0.5× halves it; 0
						mutes the region. Maximum: 4×.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					<label htmlFor="effect-semitones" className="text-sm font-medium">
						Pitch / key shift
					</label>

					<div className="flex items-center gap-3">
						<input
							id="effect-semitones"
							type="range"
							min="-24"
							max="24"
							step="1"
							value={semitones}
							disabled={saving}
							onChange={(event) => {
								setSemitones(event.target.value);
								setError(null);
							}}
							className="range range-primary flex-1"
						/>

						<input
							type="number"
							min="-24"
							max="24"
							step="1"
							value={semitones}
							disabled={saving}
							onChange={(event) => {
								setSemitones(event.target.value);
								setError(null);
							}}
							aria-label="Pitch shift in semitones"
							className="input input-bordered w-20"
						/>
					</div>

					<p className="text-xs text-base-content/60">
						Negative values lower the pitch/key; positive values raise it. 12 semitones
						equals one octave.
					</p>
				</div>
			)}

			{error && (
				<p role="alert" className="text-error text-sm">
					{error}
				</p>
			)}

			<div className="flex justify-between">
				<button type="button" onClick={onClose} disabled={saving} className="btn btn-ghost">
					Cancel
				</button>
				<button type="submit" disabled={saving} className="btn btn-primary">
					{saving ? "Saving..." : "Save effect"}
				</button>
			</div>
		</form>
	);
};
