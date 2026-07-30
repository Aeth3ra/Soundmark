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
    <div
      style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}
    >
      <button onClick={onPlayPause}>{isPlaying ? "Pause" : "Play"}</button>

      <span>
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        defaultValue="1"
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        style={{ marginLeft: "auto" }}
      />
    </div>
  );
};
