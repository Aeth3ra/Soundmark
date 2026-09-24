import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { exportAudio, exportFullAudio } from "../services/audioService";

export const AudioExportButton = ({ fileId, effects = [] }) => {
	const [exportingMode, setExportingMode] = useState(null); // null | "original" | "processed"
	const isExporting = exportingMode !== null;
	const activeEffectCount = effects.filter((effect) => effect.enabled).length;

	const runExport = async (mode, action, errorMessage) => {
		if (isExporting) return;

		// Close the focus-based dropdown once an option is chosen.
		document.activeElement?.blur();
		setExportingMode(mode);

		try {
			await action();
		} catch (error) {
			console.error(`Audio export (${mode}) failed:`, error);
			window.alert(errorMessage);
		} finally {
			setExportingMode(null);
		}
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
