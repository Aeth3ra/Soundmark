import { Meteor } from "meteor/meteor";

/**
 * Function to upload audio file into cloud
 * @param {*} file file to get uploaded
 * @returns key which is file path on the cloud
 */
export async function upload(file) {
  const { uploadUrl, key } = await Meteor.callAsync(
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
  console.log("R2 status:", response.status);
  console.log("R2 response:", await response.text());
  return key;
}

/**
 * Function that gets the link for the specific audio file
 * @param {*} key audo file link
 * @returns url for the audio from
 */
export async function getPlayableUrl(key) {
  const downloadUrl = await Meteor.callAsync("audio.getDownloadUrl", key);
  return downloadUrl;
}
