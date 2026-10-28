import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { AnnotationsCollection } from "./annotationsCollection";
import { AudioCollection } from "../audio/audioCollection";

/**
 * Validates start and end timestamps for an annotation against audio boundaries.
 *
 * @param {object} bounds
 * @param {number} bounds.start - Start time in seconds.
 * @param {number|null} bounds.end - End time in seconds (or null for point markers).
 * @param {number} [durationSeconds] - Optional total audio duration cap.
 * @throws {Meteor.Error} "invalid-time" if timing is negative, reversed, or out of bounds.
 */
function validateAnnotation({ start, end }, durationSeconds) {
	if (!Number.isFinite(start) || start < 0) {
		throw new Meteor.Error(
			"invalid-time",
			"Annotation start must be a finite non-negative number."
		);
	}

	if (end !== null) {
		if (!Number.isFinite(end) || end <= start) {
			throw new Meteor.Error(
				"invalid-time",
				"Annotation end must be after its start."
			);
		}
	}

	if (Number.isFinite(durationSeconds)) {
		if (start > durationSeconds) {
			throw new Meteor.Error(
				"invalid-time",
				"The annotation starts after the audio ends."
			);
		}

		if (end !== null && end > durationSeconds) {
			throw new Meteor.Error(
				"invalid-time",
				"The annotation ends after the audio."
			);
		}
	}
}

Meteor.methods({
	/**
	 * Creates a new annotation or timestamp marker on an audio file.
	 * Sets createdBy strictly to the authenticated user's ID.
	 *
	 * @param {object} params
	 * @param {string} params.fileId - Target audio file ID.
	 * @param {string} [params.title=""] - Annotation title.
	 * @param {string} [params.colour=""] - Hex color code.
	 * @param {number} params.start - Start time in seconds.
	 * @param {number|null} [params.end=null] - End time in seconds (null for timestamps).
	 * @param {string[]} [params.tags=[]] - Tag list.
	 * @param {string} [params.comment=""] - Detailed note text.
	 * @returns {Promise<string>} Mongo ID of the inserted annotation document.
	 * @throws {Meteor.Error} "not-authorized" if unauthenticated, "audio-not-found" if file does not exist.
	 */
	async "annotations.create"({
		fileId,
		title = "",
		colour = "",
		start,
		end = null,
		tags = [],
		comment = ""
	}) {
		if (!this.userId) {
			// authentication guard
			throw new Meteor.Error("not-authorized", "Must be logged in.");
		}

		check(fileId, String); // type checks
		check(title, String);
		check(colour, String);
		check(start, Number);
		check(end, Match.OneOf(Number, null)); // null means a timestamp marker
		check(tags, [String]);
		check(comment, String);

		const audioFile = await AudioCollection.findOneAsync(fileId);

		if (!audioFile) {
			// file must exist
			throw new Meteor.Error(
				"audio-not-found",
				"The audio file does not exist."
			);
		}

		validateAnnotation({ start, end }, audioFile.durationSeconds);

		return await AnnotationsCollection.insertAsync({
			fileId,
			title: title.trim(),
			colour,
			start,
			end,
			tags,
			comment: comment.trim(),
			createdBy: this.userId,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	},

	/**
	 * Updates content, styling, or timing for an existing annotation.
	 *
	 * @param {string} annotationId - Target annotation ID.
	 * @param {object} updates - Properties to update.
	 * @returns {Promise<number>} Number of modified documents.
	 * @throws {Meteor.Error} "not-authorized" if unauthenticated, "annotation-not-found" if missing.
	 */
	async "annotations.update"(annotationId, updates) {
		if (!this.userId) {
			throw new Meteor.Error("not-authorized", "Must be logged in.");
		}

		check(annotationId, String);

		check(updates, {
			title: String,
			colour: String,
			tags: [String],
			comment: String,
			start: Number,
			end: Match.OneOf(Number, null)
		});

		const annotation =
			await AnnotationsCollection.findOneAsync(annotationId);

		if (!annotation) {
			throw new Meteor.Error(
				"annotation-not-found",
				"The annotation does not exist."
			);
		}

		await AnnotationsCollection.updateAsync(annotationId, {
			$set: {
				title: updates.title.trim(),
				colour: updates.colour,
				tags: updates.tags,
				comment: updates.comment.trim(),
				start: updates.start,
				end: updates.end,
				updatedAt: new Date()
			}
		});
	},

	/**
	 * Removes an annotation document by ID.
	 *
	 * @param {string} annotationId - ID of the annotation to remove.
	 * @returns {Promise<void>}
	 */
	async "annotations.delete"(annotationId) {
		check(annotationId, String);

		const annotation =
			await AnnotationsCollection.findOneAsync(annotationId);

		if (!annotation) return;

		await AnnotationsCollection.removeAsync(annotationId);
	}
});
