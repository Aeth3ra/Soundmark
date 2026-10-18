import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { AudioCollection } from "./audioCollection";
import { AnnotationsCollection } from "../annotations/annotationsCollection";
import { EffectsCollection } from "../effects/effectsCollection";
import {
	r2Client,
	r2Bucket,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	r2Helpers
} from "./r2";

/**
 * Deletes the R2 object, the Mongo record, and everything that belongs
 * to the file (annotations and effects).
 */
export async function deleteAudioFile(fileId) {
	const file = await AudioCollection.findOneAsync(fileId);
	if (!file) return; // already gone

	// R2 first: if this throws, nothing has been removed from Mongo yet,
	// so the file and its data stay consistent and the delete can be retried.
	await r2Client.send(
		new DeleteObjectCommand({ Bucket: r2Bucket, Key: file.key })
	);

	await Promise.all([
		AnnotationsCollection.removeAsync({ fileId }),
		EffectsCollection.removeAsync({ fileId }),
		AudioCollection.removeAsync(fileId)
	]);
}

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
		const uploadUrl = await r2Helpers.getSignedUrl(r2Client, command, {
			expiresIn: 300
		});

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

		if (!file) {
			throw new Meteor.Error(
				"file-not-found",
				"Could not find the requested audio file."
			);
		}

		const command = new GetObjectCommand({
			Bucket: r2Bucket,
			Key: file.key
		});
		return await r2Helpers.getSignedUrl(r2Client, command, {
			expiresIn: 300
		});
	},

	/**
	 * Method to get the original audio file information for export
	 */
	async "audio.getExportInfo"(fileId) {
		const file = await AudioCollection.findOneAsync(fileId);

		if (!file) {
			throw new Meteor.Error("not-found", "Audio file not found");
		}

		const command = new GetObjectCommand({
			Bucket: r2Bucket,
			Key: file.key
		});

		const url = await r2Helpers.getSignedUrl(r2Client, command, {
			expiresIn: 300
		});

		return {
			url,
			fileName: file.fileName
		};
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
