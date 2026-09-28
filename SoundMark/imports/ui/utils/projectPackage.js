import JSZip from "jszip";
import { isEffectParamsValid } from "../lib/effectTypes";

/**
 * Bump this if the manifest/annotation/effect shape ever changes in a
 * backwards-incompatible way. parseProjectPackage() refuses to load a
 * package whose version doesn't match, rather than guessing.
 */
export const PACKAGE_VERSION = 1;

export const PACKAGE_EXTENSION = ".sndmk";

const MANIFEST_PATH = "manifest.json";
const ANNOTATIONS_PATH = "annotations.json";
const EFFECTS_PATH = "effects.json";

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
 * Structural check plus a params check against the same per-type rules the
 * effect form and card use (effectTypes.js). Effects saved under an older
 * schema, or of a type this version doesn't know, fail here.
 */
function isPortableEffect(effect) {
	return (
		Boolean(effect) &&
		typeof effect.type === "string" &&
		Number.isFinite(effect.start) &&
		Number.isFinite(effect.end) &&
		effect.start >= 0 &&
		effect.end > effect.start &&
		typeof effect.enabled === "boolean" &&
		Number.isSafeInteger(effect.order) &&
		effect.order >= 0 &&
		isEffectParamsValid(effect.type, effect.params)
	);
}

// Same ordering the renderer uses: order, then creation time, then id.
function compareEffects(a, b) {
	const byOrder = a.order - b.order;
	const byCreated =
		new Date(a.createdAt ?? 0).getTime() -
		new Date(b.createdAt ?? 0).getTime();
	const aId = String(a._id ?? "");
	const bId = String(b._id ?? "");
	return byOrder || byCreated || (aId < bId ? -1 : aId > bId ? 1 : 0);
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
 * Same idea as toPortableAnnotations, for effects: keeps what defines the
 * effect (type, region, params, enabled state, order) and drops _id, fileId,
 * createdBy and createdAt. The output is sorted into render order, so
 * importing the array front to back recreates effects with the same relative
 * ordering, even between effects that share an `order` value.
 */
export function toPortableEffects(effects) {
	return [...effects]
		.sort(compareEffects)
		.map(({ type, start, end, params, enabled, order }) => ({
			type,
			start,
			end,
			params,
			enabled,
			order
		}));
}

/**
 * Bundles an audio file + its annotations and effects into a single
 * downloadable .zip Blob.
 *
 * @param {Object} params
 * @param {string} params.fileName - original audio filename
 * @param {string} params.contentType - audio MIME type
 * @param {Blob} params.audioBlob
 * @param {Array} params.annotations - as loaded from AnnotationsCollection
 * @param {Array} [params.effects] - the file's saved effects
 * @returns {Promise<Blob>}
 */
export async function buildProjectPackage({
	fileName,
	contentType,
	audioBlob,
	annotations,
	effects = []
}) {
	const zip = new JSZip();
	const audioPath = `audio/${fileName}`;

	const manifest = {
		version: PACKAGE_VERSION,
		exportedAt: new Date().toISOString(),
		fileName,
		contentType,
		audioPath,
		annotationCount: annotations.length,
		effectCount: effects.length
	};

	zip.file(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
	zip.file(
		ANNOTATIONS_PATH,
		JSON.stringify(toPortableAnnotations(annotations), null, 2)
	);
	zip.file(EFFECTS_PATH, JSON.stringify(toPortableEffects(effects), null, 2));
	zip.file(audioPath, audioBlob);

	return zip.generateAsync({ type: "blob" });
}

async function readJsonEntry(entry, corruptedMessage) {
	try {
		return JSON.parse(await entry.async("string"));
	} catch {
		throw new ProjectPackageError(corruptedMessage);
	}
}

/**
 * Reads and validates a .zip project package, returning everything needed
 * to reconstruct it as a new project. Throws ProjectPackageError with a
 * user-facing message for anything corrupted or incompatible - never lets
 * a malformed package partway through import.
 *
 * @param {File|Blob} file
 * @returns {Promise<{
 *   fileName: string,
 *   contentType: string,
 *   annotations: Array,
 *   effects: Array,
 *   audioBlob: Blob
 * }>}
 */
export async function parseProjectPackage(file) {
	let zip;
	try {
		zip = await JSZip.loadAsync(file);
	} catch {
		throw new ProjectPackageError(
			"This doesn't look like a valid SoundMark package file."
		);
	}

	const manifestEntry = zip.file(MANIFEST_PATH);
	const annotationsEntry = zip.file(ANNOTATIONS_PATH);
	const effectsEntry = zip.file(EFFECTS_PATH);

	if (!manifestEntry || !annotationsEntry || !effectsEntry) {
		throw new ProjectPackageError(
			"This package is missing required files and can't be opened."
		);
	}

	const manifest = await readJsonEntry(
		manifestEntry,
		"This package's metadata is corrupted."
	);

	if (!manifest || typeof manifest !== "object") {
		throw new ProjectPackageError("This package's metadata is corrupted.");
	}

	if (manifest.version !== PACKAGE_VERSION) {
		throw new ProjectPackageError(
			`This package was made with an incompatible version of SoundMark (v${manifest.version ?? "unknown"}).`
		);
	}

	if (!manifest.audioPath || !manifest.fileName || !manifest.contentType) {
		throw new ProjectPackageError("This package's metadata is incomplete.");
	}

	const audioEntry = zip.file(manifest.audioPath);
	if (!audioEntry) {
		throw new ProjectPackageError(
			"This package is missing its audio file."
		);
	}

	const annotations = await readJsonEntry(
		annotationsEntry,
		"This package's annotations are corrupted."
	);

	if (
		!Array.isArray(annotations) ||
		!annotations.every(isPortableAnnotation)
	) {
		throw new ProjectPackageError(
			"This package's annotations are corrupted."
		);
	}

	const effects = await readJsonEntry(
		effectsEntry,
		"This package's effects are corrupted."
	);

	if (!Array.isArray(effects) || !effects.every(isPortableEffect)) {
		throw new ProjectPackageError(
			"This package's effects are corrupted, out of date, or not supported by this version of SoundMark."
		);
	}

	const audioBlob = await audioEntry.async("blob");

	return {
		fileName: manifest.fileName,
		contentType: manifest.contentType,
		annotations,
		effects,
		audioBlob
	};
}
