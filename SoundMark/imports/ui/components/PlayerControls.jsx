import { useState } from "react";
import { Play, Pause, Repeat, Volume2, ZoomIn } from "lucide-react";
import { formatTime } from "../utils/time";

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
  zoom
}) => {
  // For playback
  const [speedInput, setSpeedInput] = useState(String(playbackRate));

  return (
    <div className="flex items-center gap-4">
      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        className="btn btn-primary btn-circle"
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
        className={`btn btn-sm btn-square ${isLooping ? "btn-primary" : "btn-ghost"}`}
        aria-label={
          isLooping ? "Disable loop playback" : "Enable loop playback"
        }
        aria-pressed={isLooping}
        title={isLooping ? "Disable loop playback" : "Enable loop playback"}
      >
        <Repeat className="h-4 w-4" />
      </button>

      {/* Time */}
      <span className="font-mono text-sm text-base-content/70 tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Playback speed */}
      <label className="flex items-center gap-2 text-sm text-base-content/70">
        Speed:

        <div className="dropdown">
          <input
            type="text"
            maxLength={4}
            value={speedInput}
            onFocus={() => setSpeedInput("")}
            onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setSpeedInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && speedInput && (onPlaybackRateChange(Number(speedInput)), e.currentTarget.blur())}
            className="input input-bordered input-sm w-14"
          />

          <ul className="dropdown-content menu bg-base-100 rounded-box shadow w-14 mt-1">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <li key={speed}>
                <button
                  type="button"
                  onClick={() => (setSpeedInput(String(speed)), onPlaybackRateChange(speed), document.activeElement?.blur())}
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
      <div className="flex items-center gap-2 w-36">
        <ZoomIn className="h-4 w-4 text-base-content/50 shrink-0" />
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={zoom}
          onInput={(e) => onZoomChange(parseFloat(e.target.value))}
          className="range range-primary range-xs"
        />
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 ml-auto w-36">
        <Volume2 className="h-4 w-4 text-base-content/50 shrink-0" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          defaultValue="1"
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="range range-primary range-xs"
        />
      </div>
    </div>
  );
};
