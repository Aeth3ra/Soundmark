import { formatTime } from "../utils/time";

const AnalysisValue = ({ label, value, isAnalysing }) => (
  <span className="whitespace-nowrap">
    <span className="text-base-content/40">{label}</span>{" "}
    {isAnalysing ? "…" : value ?? "—"}
  </span>
);

export const RegionSelectionDisplay = ({ activeRegion, analysis }) => {
  if (!activeRegion) return null;

  const duration = analysis?.duration ?? activeRegion.end - activeRegion.start;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-base-content/70 px-6">
      <span className="whitespace-nowrap">
        Selection: {formatTime(activeRegion.start)} - {formatTime(activeRegion.end)}
      </span>
      <AnalysisValue label="Duration" value={formatTime(duration)} />
      <AnalysisValue
        label="BPM"
        value={analysis?.bpm}
        isAnalysing={analysis?.isAnalysing}
      />
      <AnalysisValue
        label="Pitch"
        value={analysis?.pitch}
        isAnalysing={analysis?.isAnalysing}
      />
      <AnalysisValue
        label="Key"
        value={analysis?.key}
        isAnalysing={analysis?.isAnalysing}
      />
    </div>
  );
};
