import { Meteor } from "meteor/meteor";

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
