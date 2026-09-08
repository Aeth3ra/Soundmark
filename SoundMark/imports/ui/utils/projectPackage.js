import JSZip from "jszip";

/**
 * Bump this if the manifest/annotation shape ever changes in a
 * backwards-incompatible way. parseProjectPackage() refuses to load a
 * package whose version doesn't match, rather than guessing.
 */
export const PACKAGE_VERSION = 1;

export const PACKAGE_EXTENSION = ".sndmk";

const MANIFEST_PATH = "manifest.json";
const ANNOTATIONS_PATH = "annotations.json";

/**
 * Thrown for any problem with a package - corrupted zip, missing files,
 * unreadable JSON, wrong shape, or an incompatible version. UI code can
 * catch this specifically and show err.message directly, since every
 * message here is already meant for the user.
 */
export class ProjectPackageError extends Error {}

function isPortableAnnotation(annotation) {
  return (
    annotation &&
    typeof annotation.start === "number" &&
    (annotation.end === null || typeof annotation.end === "number") &&
    typeof annotation.title === "string" &&
    typeof annotation.colour === "string" &&
    Array.isArray(annotation.tags) &&
    annotation.tags.every((tag) => typeof tag === "string") &&
    typeof annotation.comment === "string"
  );
}

/**
 * Strips an annotation down to the fields that make sense to carry across
 * to a different session/user: original timestamps + the user-authored
 * content. Deliberately drops _id, fileId and createdBy - those are only
 * meaningful in the database they came from, and get regenerated on
 * import (see projectPackageService.importProjectPackage).
 */
export function toPortableAnnotations(annotations) {
  return annotations.map(({ title, colour, start, end, tags, comment }) => ({
    title,
    colour,
    start,
    end,
    tags,
    comment
  }));
}

/**
 * Bundles an audio file + its annotations into a single downloadable
 * .zip Blob.
 *
 * @param {Object} params
 * @param {string} params.fileName - original audio filename
 * @param {string} params.contentType - audio MIME type
 * @param {Blob} params.audioBlob
 * @param {Array} params.annotations - as loaded from AnnotationsCollection
 * @returns {Promise<Blob>}
 */
export async function buildProjectPackage({
  fileName,
  contentType,
  audioBlob,
  annotations
}) {
  const zip = new JSZip();
  const audioPath = `audio/${fileName}`;

  const manifest = {
    version: PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    fileName,
    contentType,
    audioPath,
    annotationCount: annotations.length
  };

  zip.file(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  zip.file(
    ANNOTATIONS_PATH,
    JSON.stringify(toPortableAnnotations(annotations), null, 2)
  );
  zip.file(audioPath, audioBlob);

  return zip.generateAsync({ type: "blob" });
}
