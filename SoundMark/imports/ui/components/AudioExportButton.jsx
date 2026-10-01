import { useNotifiedExport } from "../hooks/useNotifiedExport";
import { ChevronDown } from "lucide-react";
import { exportAudio, exportFullAudio } from "../services/audioService";

export const AudioExportButton = ({ fileId, effects = [] }) => {
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

	const label =
		exportingMode === "processed"
			? "Rendering…"
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
			</ul>
		</div>
	);
};
