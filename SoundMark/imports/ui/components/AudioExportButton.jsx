import { useState } from "react";
import { exportAudio } from "../services/audioService";

export const AudioExportButton = ({ fileId }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      await exportAudio(fileId);
    } catch (error) {
      console.error("Audio export failed:", error);
      window.alert("Could not export the audio.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      disabled={isExporting}
      onClick={handleExport}
    >
      {isExporting ? "Exporting…" : "Export"}
    </button>
  );
};
