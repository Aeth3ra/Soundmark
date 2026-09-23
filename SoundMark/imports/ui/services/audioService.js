import { Meteor } from "meteor/meteor";
import {
    sliceAudioBuffer,
    encodeWavBlob,
    secondsToFileLabel
} from "../utils/audioExport";
import { applyEffectsChain } from "../utils/audioEffects";

/**
 * Function to upload audio file into cloud
 * @param {*} file file to get uploaded
 * @returns fileId which is linked to mongo entry
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
 * Function that gets the link for the specific audio file
 * @param {*} fileId audio file id for mongo entry
 * @returns url for the audio from mongo entry
 */
export async function getPlayableUrl(fileId) {
    const downloadUrl = await Meteor.callAsync("audio.getDownloadUrl", fileId);
    return downloadUrl;
}

/**
 * Function that deletes the audio file from mongo and cloudflare
 * @param {*} fileId audio file id for mongo entry
 * @returns nothing
 */
export async function deleteFile(fileId) {
    await Meteor.callAsync("audio.deleteFile", fileId);
}

/**
 * Downloads the original uploaded audio file without re-encoding it.
 * @param {string} fileId Mongo ID for the current audio file
 */
export async function exportAudio(fileId) {
    const download = await Meteor.callAsync("audio.getExportInfo", fileId);
    const response = await fetch(download.url);

    if (!response.ok) {
        throw new Error("Could not export the audio");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    try {
        link.href = objectUrl;
        link.download = download.fileName;

        document.body.appendChild(link);
        link.click();
        link.remove();
    } finally {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    }
}

const decodeAudioFile = async (arrayBuffer) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();

    try {
        // Decode the source file independently of the waveform preview
        // decodeAudioData produces floating-point samples at this context's rate
        return await context.decodeAudioData(arrayBuffer);
    } finally {
        await context.close();
    }
};

/** Decode the source once for a player's preview session. */
export async function loadAudioBuffer(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error("Could not load the audio for playback.");
    const buffer = await decodeAudioFile(await response.arrayBuffer());
    if (signal?.aborted)
        throw new DOMException("Audio load cancelled.", "AbortError");
    return buffer;
}

/** Use the same renderer as selection export, always starting from the source */
export async function createPreviewBlob(sourceBuffer, effects) {
    const processed = await applyEffectsChain(sourceBuffer, effects);
    return encodeWavBlob(processed);
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
        throw new Error("Select a region before exporting.");
    }

    const info = await Meteor.callAsync("audio.getExportInfo", fileId);
    const response = await fetch(info.url);

    if (!response.ok) {
        throw new Error("Could not fetch the audio file for export.");
    }

    const decoded = await decodeAudioFile(await response.arrayBuffer());

    const processed = await applyEffectsChain(decoded, effects);
    const sliced = sliceAudioBuffer(processed, start, end);
    const blob = encodeWavBlob(sliced);

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    try {
        link.href = objectUrl;
        link.download = `${baseFileName}-${secondsToFileLabel(start)}-${secondsToFileLabel(end)}.wav`;

        document.body.appendChild(link);
        link.click();
        link.remove();
    } finally {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    }
}
