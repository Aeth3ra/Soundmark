import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
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

const DetailRow = ({ label, value }) => (
	<div className="flex items-center gap-3">
		<span className="w-14 text-base-content/40">{label}</span>
		<span className="font-mono tabular-nums text-base-content">
			{value}
		</span>
	</div>
);

export const RegionSelectionDisplay = ({ activeRegion, analysis }) => {
	const hasSelection = Boolean(activeRegion);
	const [showDetail, setShowDetail] = useState(false);

	useEffect(() => {
		if (!hasSelection) setShowDetail(false);
	}, [hasSelection]);

	const duration = hasSelection
		? (analysis?.duration ?? activeRegion.end - activeRegion.start)
		: null;

	const hasAnalysis =
		analysis?.isAnalysing ||
		analysis?.bpm != null ||
		analysis?.pitch != null ||
		analysis?.key != null;

	return (
		<div className="relative shrink-0">
			<div
				className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-box bg-primary/10 px-3 py-1.5 text-sm transition-colors duration-150 ${
					hasSelection
						? "border-l-base-content/30 bg-base-200/70"
						: "border-l-base-300 bg-base-200/40"
				}`}
			>
				{hasSelection ? (
					<>
						<span className="font-mono tabular-nums font-semibold text-base-content">
							{formatTime(activeRegion.start)} –{" "}
							{formatTime(activeRegion.end)}
						</span>

						<span className="font-mono tabular-nums text-base-content/55">
							{formatTime(duration)}
						</span>

						<button
							type="button"
							onClick={() => setShowDetail((open) => !open)}
							className={`rounded p-0.5 transition-colors ${
								showDetail
									? "text-base-content"
									: "text-base-content/40 hover:text-base-content"
							}`}
							title="Show millisecond precision"
							aria-pressed={showDetail}
							aria-label="Toggle millisecond precision"
						>
							<Clock className="h-3.5 w-3.5" />
						</button>

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

			{hasSelection && showDetail && (
				<div className="absolute left-0 top-full z-30 mt-1 flex flex-col gap-1.5 whitespace-nowrap rounded-box border border-base-300 bg-base-100 px-3 py-2 text-xs shadow-lg">
					<DetailRow
						label="Start"
						value={formatTime(activeRegion.start, { millis: true })}
					/>
					<DetailRow
						label="End"
						value={formatTime(activeRegion.end, { millis: true })}
					/>
					<DetailRow
						label="Length"
						value={formatTime(duration, { millis: true })}
					/>
				</div>
			)}
		</div>
	);
};
