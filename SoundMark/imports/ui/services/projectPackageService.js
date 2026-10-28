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
 * Imports a .sndmk package: uploads its audio as a new file, then recreates
 * every annotation and effect against the new fileId. Timestamps need no
 * adjustment (they are offsets into the audio). On failure the new audio is
 * rolled back, so no half-restored project remains.
 * @param {File} file - package chosen by the user
 * @returns {Promise<string>} the new fileId
 * @throws {ProjectPackageError} for a corrupted or incompatible package
 */
export async function importProjectPackage(file) {
	// Validates every layer of the package before anything is uploaded
	const { fileName, contentType, annotations, effects, audioBlob } =
		await parseProjectPackage(file);

	const audioFile = new File([audioBlob], fileName, { type: contentType });
	const fileId = await upload(audioFile); // the audio becomes a new file with its own id

	try {
		for (const annotation of annotations) {
			// restore annotations
			await createAnnotation({ fileId, ...annotation });
		}

		for (const effect of effects) {
			// restore effects, in saved order
			await createEffect({ fileId, ...effect });
		}
	} catch (err) {
		await deleteFile(fileId).catch(() => {}); // roll back the uploaded audio
		throw err;
	}

	return fileId;
}
