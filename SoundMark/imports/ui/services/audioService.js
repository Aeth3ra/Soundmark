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
