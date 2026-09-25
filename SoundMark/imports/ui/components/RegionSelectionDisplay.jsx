import { formatTime } from "../utils/time";

const AnalysisChip = ({ label, value, isAnalysing }) => (
	<span className="whitespace-nowrap">
		<span className="text-[10px] uppercase tracking-wide text-base-content/40">
			{label}
		</span>{" "}
		<span className="font-mono tabular-nums">
			{isAnalysing ? "…" : (value ?? "—")}
		</span>
	</span>
);

export const RegionSelectionDisplay = ({ activeRegion, analysis }) => {
	const hasSelection = Boolean(activeRegion);

	const duration = hasSelection
		? (analysis?.duration ?? activeRegion.end - activeRegion.start)
		: null;

	const hasAnalysis =
		analysis?.isAnalysing ||
		analysis?.bpm != null ||
		analysis?.pitch != null ||
		analysis?.key != null;

	return (
		<div
			className={`flex items-center gap-3 whitespace-nowrap rounded-box px-3 py-1.5 text-sm transition-colors duration-150 ${
				hasSelection
					? "border-l-primary bg-primary/10"
					: "border-l-base-300 bg-base-200/40"
			}`}
		>
			{hasSelection ? (
				<>
					<span className="font-mono tabular-nums font-semibold text-base-content">
						{formatTime(activeRegion.start, { millis: true })} –{" "}
						{formatTime(activeRegion.end, { millis: true })}
					</span>

					<span className="font-mono tabular-nums text-base-content/55">
						{formatTime(duration, { millis: true })}
					</span>

					{hasAnalysis && (
						<>
							<span className="h-4 w-px bg-base-300" />

							<AnalysisChip
								label="BPM"
								value={analysis?.bpm}
								isAnalysing={analysis?.isAnalysing}
							/>

							<AnalysisChip
								label="Key"
								value={analysis?.key}
								isAnalysing={analysis?.isAnalysing}
							/>

							<AnalysisChip
								label="Pitch"
								value={analysis?.pitch}
								isAnalysing={analysis?.isAnalysing}
							/>
						</>
					)}
				</>
			) : (
				<span className="text-base-content/40">No selection</span>
			)}
		</div>
	);
};
