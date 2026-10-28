import { Meteor } from "meteor/meteor";
import {
	sliceAudioBuffer,
	encodeWavBlob,
	secondsToFileLabel
} from "../utils/audioExport";
import { applyEffectsChain } from "../utils/audioEffects";

/**
 * Uploads an audio file to Cloudflare R2 storage via a presigned URL.
 *
 * @param {File} file - Audio file to upload.
 * @returns {Promise<string>} Mongo ID of the created audio document.
 * @throws {Error} If presigned URL creation or R2 upload fails.
 */
export async function upload(file) {
	const { uploadUrl, fileId } = await Meteor.callAsync(
		"audio.getUploadUrl",
		file.name,
		file.type
	);

	const response = await fetch(uploadUrl, {
		method: "PUT",
		headers: {
			"Content-Type": file.type
		},
		body: file
	});

	if (!response.ok) {
		throw new Error("Upload to storage failed");
	}

	return fileId;
}

/**
 * Retrieves a signed temporary download URL for playback.
 *
 * @param {string} fileId - ID of the audio file document.
 * @returns {Promise<string>} Signed download URL.
 */
export async function getPlayableUrl(fileId) {
	const downloadUrl = await Meteor.callAsync("audio.getDownloadUrl", fileId);
	return downloadUrl;
}

/**
 * Deletes the audio file from R2 storage along with its database records.
 *
 * @param {string} fileId - ID of the audio file to delete.
 * @returns {Promise<void>}
 */
export async function deleteFile(fileId) {
	await Meteor.callAsync("audio.deleteFile", fileId);
}

/**
 * Downloads the unmodified original audio file from cloud storage.
 *
 * @param {string} fileId - ID of the audio file to export.
 * @returns {Promise<void>}
 */
export async function exportAudio(fileId) {
	const info = await Meteor.callAsync("audio.getExportInfo", fileId);
	const response = await fetch(info.url);

	if (!response.ok) {
		throw new Error("Could not export the audio");
	}

	const blob = await response.blob();

	downloadBlob(blob, info.fileName);
}

/**
 * Decodes raw audio array buffer into an AudioBuffer using an ephemeral AudioContext.
 *
 * @param {ArrayBuffer} arrayBuffer - Raw audio file bytes.
 * @returns {Promise<AudioBuffer>} Decoded Web Audio buffer.
 */
const decodeAudioFile = async (arrayBuffer) => {
	const AudioContextClass = window.AudioContext || window.webkitAudioContext;
	const context = new AudioContextClass();

	try {
		return await context.decodeAudioData(arrayBuffer);
	} finally {
		await context.close();
	}
};

/**
 * Fetches and decodes the audio file into an AudioBuffer for preview playback.
 *
 * @param {string} url - Source audio URL.
 * @param {AbortSignal} [signal] - Optional abort signal for cancellation.
 * @returns {Promise<AudioBuffer>} Decoded audio buffer.
 */
export async function loadAudioBuffer(url, signal) {
	const response = await fetch(url, { signal });
	if (!response.ok) throw new Error("Could not load the audio for playback.");
	const buffer = await decodeAudioFile(await response.arrayBuffer());
	if (signal?.aborted)
		throw new DOMException("Audio load cancelled.", "AbortError");
	return buffer;
}

/**
 * Renders an effects preview WAV Blob from an unmodified source buffer.
 *
 * @param {AudioBuffer} sourceBuffer - Clean decoded source track.
 * @param {Array<object>} effects - Current list of active effects.
 * @returns {Promise<Blob>} Processed audio preview Blob in WAV format.
 */
export async function createPreviewBlob(sourceBuffer, effects) {
	const processed = await applyEffectsChain(sourceBuffer, effects);
	return encodeWavBlob(processed);
}

/**
 * Fetches and decodes the source audio, then applies the saved effects.
 *
 * @param {Object} params
 * @param {string} params.fileId
 * @param {Array} [params.effects]
 * @returns {Promise<AudioBuffer>}
 */
async function getProcessedAudio({ fileId, effects = [] }) {
	const info = await Meteor.callAsync("audio.getExportInfo", fileId);
	const response = await fetch(info.url);

	if (!response.ok) {
		throw new Error("Could not fetch the audio file for export.");
	}

	const arrayBuffer = await response.arrayBuffer();
	const decoded = await decodeAudioFile(arrayBuffer);

	return applyEffectsChain(decoded, effects);
}

/**
 * Downloads an audio Blob as a file.
 *
 * @param {Blob} blob
 * @param {string} fileName
 */
function downloadBlob(blob, fileName) {
	const objectUrl = URL.createObjectURL(blob);
	const link = document.createElement("a");

	try {
		link.href = objectUrl;
		link.download = fileName;

		document.body.appendChild(link);
		link.click();
		link.remove();
	} finally {
		window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
	}
}

/**
 * Exports the currently selected timeline region as a standalone WAV file
 *
 * Decodes the source file, applies saved effects on the full timeline,
 * then crops and encodes the selected region. Player preview is separate
 *
 * @param {Object} params
 * @param {string} params.fileId
 * @param {number} params.start - region start, seconds
 * @param {number} params.end - region end, seconds
 * @param {Array} [params.effects] - saved effects for this file
 * @param {string} [params.baseFileName]
 */
export async function exportRegion({
	fileId,
	start,
	end,
	effects = [],
	baseFileName = "soundmark-selection"
}) {
	if (
		!Number.isFinite(start) ||
		!Number.isFinite(end) ||
		start < 0 ||
		end <= start
	) {
		throw new Error("Select a valid region before exporting.");
	}

	const processed = await getProcessedAudio({
		fileId,
		effects
	});

	if (end > processed.duration) {
		throw new Error("The selected region is outside the audio duration.");
	}

	const sliced = sliceAudioBuffer(processed, start, end);
	const blob = encodeWavBlob(sliced);

	const startLabel = secondsToFileLabel(start);
	const endLabel = secondsToFileLabel(end);

	downloadBlob(blob, `${baseFileName}-${startLabel}-${endLabel}.wav`);
}

/**
 * Exports the entire audio file with the current effects applied.
 *
 * @param {Object} params
 * @param {string} params.fileId
 * @param {Array} [params.effects]
 * @param {string} [params.baseFileName]
 */
export async function exportFullAudio({
	fileId,
	effects = [],
	baseFileName = "soundmark-audio"
}) {
	const processed = await getProcessedAudio({
		fileId,
		effects
	});

	const blob = encodeWavBlob(processed);

	downloadBlob(blob, `${baseFileName}.wav`);
}
