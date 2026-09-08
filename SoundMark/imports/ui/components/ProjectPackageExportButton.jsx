import { useState } from "react";
import { exportProjectPackage } from "../services/projectPackageService";

/**
 * Downloads a .zip package containing the audio file and all of its
 * annotations, so the project can be reloaded later (see UploadPage's
 * "Import a project package").
 */
export const ProjectPackageExportButton = ({ fileId, annotations }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);

    try {
      await exportProjectPackage({ fileId, annotations });
    } catch (error) {
      console.error("Project package export failed:", error);
      window.alert("Could not export the project package.");
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
      {isExporting ? "Packaging…" : "Export project"}
    </button>
  );
};
