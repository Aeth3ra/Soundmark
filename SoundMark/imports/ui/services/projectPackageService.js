import { Meteor } from "meteor/meteor";
import { upload, deleteFile } from "./audioService";
import { createAnnotation } from "./annotationService";
import {
  buildProjectPackage,
  parseProjectPackage,
  PACKAGE_EXTENSION
} from "../utils/projectPackage";

/**
 * Downloads a .zip package containing the audio file for `fileId` plus
 * all of its annotations. `annotations` is passed in rather than fetched
 * here so callers (PlayerPage) can reuse the reactive data they've
 * already subscribed to instead of us doing a second round trip.
 *
 * @param {Object} params
 * @param {string} params.fileId
 * @param {Array} params.annotations
 */
export async function exportProjectPackage({ fileId, annotations }) {
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
    annotations
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
 * recreates each annotation against that new fileId with its original
 * start/end timestamps and metadata intact. Timestamps don't need any
 * adjustment on import since they're stored as offsets (seconds) into
 * the audio, not absolute references to the old file.
 *
 * If any annotation fails to create partway through, the newly-uploaded
 * audio (and any annotations already created against it) are rolled back
 * rather than leaving a half-restored project behind.
 *
 * Throws ProjectPackageError (from parseProjectPackage) if the package is
 * corrupted or incompatible - that error's .message is safe to show
 * directly to the user.
 *
 * @param {File} file
 * @returns {Promise<string>} the new fileId, ready to navigate to
 */
export async function importProjectPackage(file) {
  const { fileName, contentType, annotations, audioBlob } =
    await parseProjectPackage(file);

  const audioFile = new File([audioBlob], fileName, { type: contentType });
  const fileId = await upload(audioFile);

  try {
    for (const annotation of annotations) {
      await createAnnotation({ fileId, ...annotation });
    }
  } catch (err) {
    await deleteFile(fileId).catch(() => {});
    throw err;
  }

  return fileId;
}
