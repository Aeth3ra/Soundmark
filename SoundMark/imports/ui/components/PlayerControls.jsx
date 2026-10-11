import { useCallback, useEffect, useState } from "react";
import { Play, Pause, Repeat, Volume2, ZoomIn } from "lucide-react";
import { formatTime } from "../utils/time";
import { ToastError } from "./ToastError.jsx";

const MIN_PLAYBACK_RATE = 0.0625;
const MAX_PLAYBACK_RATE = 16;

const isValidPlaybackRate = (rate) =>
	Number.isFinite(rate) &&
	rate >= MIN_PLAYBACK_RATE &&
	rate <= MAX_PLAYBACK_RATE;

export const PlayerControls = ({
	isPlaying,
	isLooping,
	playbackRate,
	currentTime,
	duration,
	onPlayPause,
	onToggleLoop,
	onPlaybackRateChange,
	onVolumeChange,
	onZoomChange,
	zoom,
	disabled = false
}) => {
	const [speedInput, setSpeedInput] = useState(String(playbackRate));
	const [speedError, setSpeedError] = useState(null);

	// Keep this stable so playback updates don't restart the toast timer.
	const clearSpeedError = useCallback(() => {
		setSpeedError(null);
	}, []);

	useEffect(() => {
		setSpeedInput(String(playbackRate));
	}, [playbackRate]);

	const showSpeedError = (message) => {
		// A new ID restarts the timer even for the same error message.
		setSpeedError((previous) => ({
			id: (previous?.id ?? 0) + 1,
			message
		}));
	};

	const changePlaybackRate = (rate) => {
		if (!isValidPlaybackRate(rate)) {
			showSpeedError(
				`That playback speed is not allowed. Enter a value between ${MIN_PLAYBACK_RATE}× and ${MAX_PLAYBACK_RATE}×.`
			);
			return;
		}

		try {
			if (onPlaybackRateChange(rate) === false) {
				showSpeedError(
					"Playback speed could not be changed. Please try again."
				);
				return;
			}

			clearSpeedError();
		} catch {
			showSpeedError(
				"Could not apply this playback speed. Please try another value."
			);
		}
	};

	return (
		<>
			<fieldset
				disabled={disabled}
				className="flex flex-wrap items-center gap-4"
			>
				{/* Play / Pause */}
				<button
					onClick={onPlayPause}
					className="btn btn-primary btn-circle shrink-0"
					aria-label={isPlaying ? "Pause" : "Play"}
				>
					{isPlaying ? (
						<Pause className="h-5 w-5" fill="currentColor" />
					) : (
						<Play className="h-5 w-5 ml-0.5" fill="currentColor" />
					)}
				</button>

				{/* Loop */}
				<button
					onClick={onToggleLoop}
					className={`btn btn-sm btn-square shrink-0 ${
						isLooping ? "btn-primary" : "btn-ghost"
					}`}
					aria-label={
						isLooping
							? "Disable loop playback"
							: "Enable loop playback"
					}
					aria-pressed={isLooping}
					title={
						isLooping
							? "Disable loop playback"
							: "Enable loop playback"
					}
				>
					<Repeat className="h-4 w-4" />
				</button>

				{/* Time */}
				<span className="shrink-0 font-mono text-sm text-base-content/70 tabular-nums">
					{formatTime(currentTime)} / {formatTime(duration)}
				</span>

				{/* Playback speed */}
				<label className="flex shrink-0 items-center gap-2 text-sm text-base-content/70">
					Speed:
					<span
						className="tabular-nums"
						aria-label="Current playback speed"
					>
						{playbackRate}×
					</span>

					<div className="dropdown">
						<input
							type="text"
							inputMode="decimal"
							aria-label="Set playback speed"
							title={`Enter a speed between ${MIN_PLAYBACK_RATE}× and ${MAX_PLAYBACK_RATE}×, then press Enter.`}
							value={speedInput}
							onFocus={(e) => e.currentTarget.select()}
							onBlur={() => setSpeedInput(String(playbackRate))}
							onChange={(e) => setSpeedInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key !== "Enter") return;
								e.preventDefault();

								changePlaybackRate(Number(speedInput));
								setSpeedInput(String(playbackRate));
								e.currentTarget.blur();
							}}
							className="input input-bordered input-sm w-24"
						/>

						<ul className="dropdown-content menu bg-base-100 rounded-box shadow w-24 mt-1">
							{[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
								<li key={speed}>
									<button
										type="button"
										onClick={() => {
											changePlaybackRate(speed);
											setSpeedInput(String(playbackRate));
											document.activeElement?.blur();
										}}
										className="w-full justify-center px-0 tabular-nums"
									>
										{speed}×
									</button>
								</li>
							))}
						</ul>
					</div>
				</label>

				{/* Zoom */}
				<div className="flex shrink-0 items-center gap-2 w-36">
					<ZoomIn className="h-4 w-4 text-base-content/50 shrink-0" />
					<input
						type="range"
						min="0"
						max="1000"
						step="10"
						value={zoom}
						onInput={(e) =>
							onZoomChange(parseFloat(e.target.value))
						}
						className="range range-primary range-xs"
					/>
				</div>

				{/* Volume */}
				<div className="flex shrink-0 items-center gap-2 ml-auto w-36">
					<Volume2 className="h-4 w-4 text-base-content/50 shrink-0" />
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						defaultValue="1"
						onChange={(e) =>
							onVolumeChange(parseFloat(e.target.value))
						}
						className="range range-primary range-xs"
					/>
				</div>
			</fieldset>

			{/* Outside the fieldset so the close button stays enabled. */}
			{speedError && (
				<ToastError
					key={speedError.id}
					message={speedError.message}
					onClose={clearSpeedError}
					autoDismissMs={5000}
				/>
			)}
		</>
	);
};