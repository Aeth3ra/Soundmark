import { Play, Pause, Repeat, Volume2 } from "lucide-react";
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
  onVolumeChange
}) => {
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
        Speed
        <select
          value={playbackRate}
          onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
          className="select select-bordered select-sm"
          aria-label="Playback speed"
        >
          <option value="0.5">0.5×</option>
          <option value="0.75">0.75×</option>
          <option value="1">1×</option>
          <option value="1.25">1.25×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
      </label>

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
