import { Meteor } from "meteor/meteor";
import { upload, deleteFile } from "./audioService";
import { createAnnotation } from "./annotationService";
import { createEffect } from "./effectsService";
import {
	buildProjectPackage,
	parseProjectPackage,
	PACKAGE_EXTENSION
} from "../utils/projectPackage";

/**
 * Downloads a .zip package containing the audio file for `fileId` plus
 * all of its annotations and effects. `annotations` and `effects` are
 * passed in rather than fetched here so callers (PlayerPage) can reuse the
 * reactive data they've already subscribed to instead of us doing extra
 * round trips.
 *
 * @param {Object} params
 * @param {string} params.fileId
 * @param {Array} params.annotations
 * @param {Array} params.effects
 */
export async function exportProjectPackage({ fileId, annotations, effects }) {
	const info = await Meteor.callAsync("audio.getExportInfo", fileId);
	const response = await fetch(info.url);

	if (!response.ok) {
		throw new Error("Could not fetch the audio file for export.");
	}

	const audioBlob = await response.blob();
	const contentType = audioBlob.type || "application/octet-stream";

	const packageBlob = await buildProjectPackage({
		fileName: info.fileName,
		contentType,
		audioBlob,
		annotations,
		effects
	});

	const objectUrl = URL.createObjectURL(packageBlob);
	const link = document.createElement("a");
	const baseName = info.fileName.replace(/\.[^/.]+$/, "");

	try {
		link.href = objectUrl;
		link.download = `${baseName}-soundmark-package${PACKAGE_EXTENSION}`;

		document.body.appendChild(link);
		link.click();
		link.remove();
	} finally {
		window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
	}
}

/**
 * Imports a .zip project package: uploads its audio as a new file, then
 * recreates each annotation and effect against that new fileId with its
 * original timestamps, params and metadata intact. Timestamps don't need
 * any adjustment on import since they're stored as offsets (seconds) into
 * the audio, not absolute references to the old file.
 *
 * Effects are created one at a time in the package's order (already sorted
 * into render order on export), so effects that share an `order` value keep
 * their relative sequence.
 *
 * If any annotation or effect fails to create partway through, the
 * newly-uploaded audio (and anything already created against it) is rolled
 * back rather than leaving a half-restored project behind.
 *
 * Throws ProjectPackageError (from parseProjectPackage) if the package is
 * corrupted or incompatible - that error's .message is safe to show
 * directly to the user.
 *
 * @param {File} file
 * @returns {Promise<string>} the new fileId, ready to navigate to
 */
export async function importProjectPackage(file) {
	const { fileName, contentType, annotations, effects, audioBlob } =
		await parseProjectPackage(file);

	const audioFile = new File([audioBlob], fileName, { type: contentType });
	const fileId = await upload(audioFile);

	try {
		for (const annotation of annotations) {
			await createAnnotation({ fileId, ...annotation });
		}

		for (const effect of effects) {
			await createEffect({ fileId, ...effect });
		}
	} catch (err) {
		await deleteFile(fileId).catch(() => {});
		throw err;
	}

	return fileId;
}
