import { Meteor } from "meteor/meteor";

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
