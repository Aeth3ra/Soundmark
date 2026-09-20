import { useState } from "react";
import { exportRegion } from "../services/audioService";

/**
 * Exports the currently selected region as a standalone WAV file.
 * Lives alongside "Create annotation" / "Clear region" in the region
 * actions row for now, until that row gets promoted to a proper menu.
 */
export const RegionExportButton = ({ fileId, activeRegion, effects = [], isEffectsLoading = false }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting || !activeRegion || isEffectsLoading) return;

    setIsExporting(true);

    try {
      await exportRegion({
        fileId,
        start: activeRegion.start,
        end: activeRegion.end,
        effects
      });
    } catch (error) {
      console.error("Region export failed:", error);
      window.alert(error.reason || error.message || "Could not export the selected region.");
    } finally {
      setIsExporting(false);
    }
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
