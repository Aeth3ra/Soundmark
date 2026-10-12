import { useNotifiedExport } from "../hooks/useNotifiedExport";
import { ChevronDown } from "lucide-react";
import { exportAudio, exportFullAudio, exportRegion } from "../services/audioService";
import { exportProjectPackage } from "../services/projectPackageService";

/**
 * Single Export menu: original audio, audio with effects, the selected
 * region, and the re-importable project package. All items share one
 * useNotifiedExport instance, so only one export runs at a time.
 */
export const AudioExportButton = ({
	fileId,
	effects = [],
	annotations = [],
	activeRegion = null,
	isEffectsLoading = false
}) => {
	const { run, mode: exportingMode, isExporting } = useNotifiedExport(fileId);
	const activeEffectCount = effects.filter((effect) => effect.enabled).length;
	const runExport = (mode, action, errorMessage) => {
		document.activeElement?.blur();
		return run({ mode, action, errorMessage, pending: mode === "processed" ? "Rendering audio…" : "Exporting audio…" });
	};

	const handleExportOriginal = () =>
		runExport(
			"original",
			() => exportAudio(fileId),
			"Could not export the audio."
		);

	const handleExportWithEffects = () =>
		runExport(
			"processed",
			() => exportFullAudio({ fileId, effects }),
			"Could not export the audio with effects applied."
		);

	const handleExportSelection = () => {
		if (!activeRegion || isEffectsLoading) return;
		const options = { fileId, start: activeRegion.start, end: activeRegion.end, effects };
		document.activeElement?.blur();
		return run({
			mode: "selection",
			action: () => exportRegion(options),
			pending: "Exporting selection…",
			errorMessage: "Could not export the selected region."
		});
	};

	const handleExportProject = () => {
		document.activeElement?.blur();
		return run({
			mode: "project",
			action: () => exportProjectPackage({ fileId, annotations, effects }),
			pending: "Packaging project…",
			errorMessage: "Could not export the project package."
		});
	};

	const label =
		exportingMode === "processed"
			? "Rendering…"
			: exportingMode === "project"
				? "Packaging…"
				: isExporting
					? "Exporting…"
					: "Export";

	return (
		<div className="dropdown dropdown-end">
			<div
				tabIndex={isExporting ? -1 : 0}
				role="button"
				aria-haspopup="menu"
				aria-disabled={isExporting}
				className={`btn btn-outline btn-sm ${isExporting ? "btn-disabled" : ""}`}
			>
				{label}
				<ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
			</div>

			<ul
				tabIndex={0}
				className="dropdown-content menu z-10 mt-1 w-60 rounded-box border border-base-300 bg-base-100 p-1 shadow-sm"
			>
				<li>
					<button type="button" onClick={handleExportOriginal}>
						Original audio
					</button>
				</li>
				<li>
					<button
						type="button"
						onClick={handleExportWithEffects}
						disabled={activeEffectCount === 0}
					>
						{activeEffectCount === 0
							? "With effects (none active)"
							: `With effects (${activeEffectCount} active)`}
					</button>
				</li>
				<li>
					<button
						type="button"
						onClick={handleExportSelection}
						disabled={!activeRegion || isEffectsLoading}
					>
						Export selection
					</button>
				</li>
				<li>
					<button type="button" onClick={handleExportProject}>
						Export project
					</button>
				</li>
			</ul>
		</div>
	);
};
