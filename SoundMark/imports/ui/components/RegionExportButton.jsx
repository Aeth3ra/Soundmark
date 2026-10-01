import { useNotifiedExport } from "../hooks/useNotifiedExport";
import { exportRegion } from "../services/audioService";

/**
 * Exports the currently selected region as a standalone WAV file.
 * Lives alongside "Create annotation" / "Clear region" in the region
 * actions row for now, until that row gets promoted to a proper menu.
 */
export const RegionExportButton = ({ fileId, activeRegion, effects = [], isEffectsLoading = false }) => {
  const { run, isExporting } = useNotifiedExport(fileId);
  const handleExport = () => {
    if (!activeRegion || isEffectsLoading) return;
    const options = { fileId, start: activeRegion.start, end: activeRegion.end, effects };
    return run({ action: () => exportRegion(options), pending: "Exporting selection…", errorMessage: "Could not export the selected region." });
  };

  return (
    <button
      type="button"
      className="btn btn-sm btn-outline gap-2"
      disabled={!activeRegion || isExporting || isEffectsLoading}
      onClick={handleExport}
    >
      {isExporting ? "Exporting…" : "Export selection"}
    </button>
  );
};
