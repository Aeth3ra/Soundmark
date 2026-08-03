import { Play, Pause, Volume2 } from "lucide-react";

const formatTime = (sec) => {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export const PlayerControls = ({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
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

      {/* Time */}
      <span className="font-mono text-sm text-base-content/70 tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

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
