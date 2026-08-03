import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { AudioCollection } from "./audioCollection";
import {
  r2Client,
  r2Bucket,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  getSignedUrl
} from "./r2";

Meteor.methods({
  /**
   * Method to get URL for audio to be uploaded
   */
  async "audio.getUploadUrl"(filename, contentType) {
    // the path for the object to be stored in
    const key = `audio/${Random.id()}-${filename}`;
    console.log("Upload URL requested:", filename, contentType);
    //command to upload the file
    const command = new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      ContentType: contentType
    });

    // get the upload URL
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });

    // Insert into Mongo
    const fileId = await AudioCollection.insertAsync({
      key,
      fileName: filename,
      contentType,
      status: "pending",
      createdAt: new Date()
    });

    return { uploadUrl, fileId };
  },

  /**
   * Method to get URL for audio to be downloaded
   */
  async "audio.getDownloadUrl"(fileId) {
    const file = await AudioCollection.findOneAsync(fileId);
    const command = new GetObjectCommand({
      Bucket: r2Bucket,
      Key: file.key
    });
    return await getSignedUrl(r2Client, command, { expiresIn: 300 });
  },
  /**
   * Deletes the R2 object and Mongo record together. Called when a user
   * leaves the player page without exporting/saving anything.
   */
  async "audio.deleteFile"(fileId) {
    const file = await AudioCollection.findOneAsync(fileId);
    if (!file) return; // already gone, nothing to do

    await r2Client.send(
      new DeleteObjectCommand({ Bucket: r2Bucket, Key: file.key })
    );
    await AudioCollection.removeAsync(fileId);
  }
});
