import { useNotifiedExport } from "../hooks/useNotifiedExport";
import { exportProjectPackage } from "../services/projectPackageService";

/**
 * Downloads a .zip package containing the audio file and all of its
 * annotations, so the project can be reloaded later (see UploadPage's
 * "Import a project package").
 */
export const ProjectPackageExportButton = ({
	fileId,
	annotations,
	effects
}) => {
	const { run, isExporting } = useNotifiedExport(fileId);
	const handleExport = () => run({
		action: () => exportProjectPackage({ fileId, annotations, effects }),
		pending: "Packaging project…", errorMessage: "Could not export the project package."
	});

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
