import { useState } from "react";
import { exportRegion } from "../services/audioService";

/**
 * Exports the currently selected region as a standalone WAV file.
 * Lives alongside "Create annotation" / "Clear region" in the region
 * actions row for now, until that row gets promoted to a proper menu.
 */
export const RegionExportButton = ({ wavesurferInstance, activeRegion }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting || !activeRegion) return;

    setIsExporting(true);

    try {
      await exportRegion({
        wavesurferInstance,
        start: activeRegion.start,
        end: activeRegion.end
      });
    } catch (error) {
      console.error("Region export failed:", error);
      window.alert("Could not export the selected region.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-sm btn-outline gap-2"
      disabled={!activeRegion || isExporting}
      onClick={handleExport}
    >
      {isExporting ? "Exporting…" : "Export selection"}
    </button>
  );
};
