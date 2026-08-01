import { Meteor } from "meteor/meteor";
import {
  r2Client,
  r2Bucket,
  PutObjectCommand,
  GetObjectCommand,
  getSignedUrl
} from "./r2";

Meteor.methods({
  /**
   * Method to get URL for audio to be uploaded
   */
  async "audio.getUploadUrl"(filename, contentType) {
    // the path for the object to be stored in
    const key = `audio/${Date.now()}-${filename}`;
    console.log("Upload URL requested:", filename, contentType);
    //command to upload the file
    const command = new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      ContentType: contentType
    });

    // get the upload URL
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    console.log(uploadUrl);
    return { uploadUrl, key };
  },

  /**
   * Method to get URL for audio to be downloaded
   */
  async "audio.getDownloadUrl"(key) {
    const command = new GetObjectCommand({
      Bucket: r2Bucket,
      Key: key
    });
    return await getSignedUrl(r2Client, command, { expiresIn: 300 });
  }
});
