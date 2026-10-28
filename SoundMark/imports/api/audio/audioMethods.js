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
 * Deletes an audio object from R2 storage and cascades deletion to all
 * related Mongo records (annotations, effects, audio metadata).
 *
 * @param {string} fileId - ID of the audio document to delete.
 * @returns {Promise<void>}
 */
export async function deleteAudioFile(fileId) {
	const file = await AudioCollection.findOneAsync(fileId);
	if (!file) return;

	// Remove cloud object first; if this fails, database records remain intact for retry
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
	 * Generates a presigned PUT URL for direct client upload to Cloudflare R2
	 * and creates a pending audio document.
	 *
	 * @param {string} filename - Original name of the uploaded file.
	 * @param {string} contentType - Audio MIME type.
	 * @returns {Promise<{ uploadUrl: string, fileId: string }>}
	 */
	async "audio.getUploadUrl"(filename, contentType) {
		const key = `audio/${Random.id()}-${filename}`;
		console.log("Upload URL requested:", filename, contentType);

		const command = new PutObjectCommand({
			Bucket: r2Bucket,
			Key: key,
			ContentType: contentType
		});

		const uploadUrl = await r2Helpers.getSignedUrl(r2Client, command, {
			expiresIn: 300
		});

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
	 * Generates a signed GET URL for streaming/downloading audio from R2.
	 *
	 * @param {string} fileId - ID of the audio document.
	 * @returns {Promise<string>} Signed download URL valid for 5 minutes.
	 * @throws {Meteor.Error} "file-not-found" if the document does not exist.
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
	 * Returns export metadata and a signed download URL for an audio file.
	 *
	 * @param {string} fileId - ID of the audio document.
	 * @returns {Promise<{ url: string, fileName: string }>}
	 * @throws {Meteor.Error} "not-found" if the file record does not exist.
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
	 * Removes an audio object from R2 and its document from Mongo.
	 *
	 * @param {string} fileId - ID of the audio document to delete.
	 * @returns {Promise<void>}
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
