import { Meteor } from "meteor/meteor";
import {
  sliceAudioBuffer,
  applyEffectsChain,
  encodeWavBlob,
  secondsToFileLabel
} from "../utils/audioExport";

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
    // decodeAudioData reads the file's actual sample rate/bit depth - this
    // is deliberately independent of wavesurfer's own decoded data, which
    // is decoded at a fixed 8kHz by default (fine for drawing peaks, far
    // too lossy for an exported file).
    return await context.decodeAudioData(arrayBuffer);
  } finally {
    context.close();
  }
};

/**
 * Exports the currently selected timeline region as a standalone WAV file.
 *
 * Fetches and decodes the original audio file itself at full quality,
 * rather than reusing wavesurferInstance.getDecodedData() - that data is
 * decoded at a fixed low sample rate (8kHz by default) for waveform
 * rendering performance and isn't suitable for an exported file. It then
 * runs the sliced region through applyEffectsChain() before encoding - a
 * no-op today since effects aren't implemented, but the point where a
 * future effects chain plugs in so exported regions keep matching what's
 * audible.
 *
 * @param {Object} params
 * @param {string} params.fileId
 * @param {number} params.start - region start, seconds
 * @param {number} params.end - region end, seconds
 * @param {Array} [params.effects] - reserved for future effect descriptors
 * @param {string} [params.baseFileName]
 */
export async function exportRegion({
  fileId,
  start,
  end,
  effects = [],
  baseFileName = "soundmark-selection"
}) {
  if (end == null || start == null || end <= start) {
    throw new Error("Select a region before exporting.");
  }

  const info = await Meteor.callAsync("audio.getExportInfo", fileId);
  const response = await fetch(info.url);

  if (!response.ok) {
    throw new Error("Could not fetch the audio file for export.");
  }

  const decoded = await decodeAudioFile(await response.arrayBuffer());

  const sliced = sliceAudioBuffer(decoded, start, end);
  const processed = applyEffectsChain(sliced, effects);
  const blob = encodeWavBlob(processed);

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
