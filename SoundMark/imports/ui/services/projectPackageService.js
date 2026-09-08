import { Meteor } from "meteor/meteor";
import { upload, deleteFile } from "./audioService";
import { createAnnotation } from "./annotationService";
import { buildProjectPackage, parseProjectPackage } from "../utils/projectPackage";

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
    link.download = `${baseName}-soundmark-package.zip`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}
