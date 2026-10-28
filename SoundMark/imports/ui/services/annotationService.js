import { Meteor } from "meteor/meteor";

/**
 * Deletes an annotation document via Meteor RPC.
 *
 * @param {{ _id: string }} annotation - Annotation to delete.
 * @returns {Promise<void>}
 */
export async function deleteAnnotation(annotation) {
	try {
		await Meteor.callAsync("annotations.delete", annotation._id);
	} catch (err) {
		console.error("Couldn't delete annotation", err);
		throw err;
	}
}

/**
 * Creates a new annotation document for an audio file.
 *
 * @param {object} params
 * @param {string} params.fileId - Target audio file ID.
 * @param {string} params.title - Title or headline of the annotation.
 * @param {string} params.colour - Hex color code.
 * @param {number} params.start - Start time in seconds.
 * @param {number|null} [params.end] - End time in seconds, or null for point markers.
 * @param {string[]} [params.tags] - Category tags.
 * @param {string} [params.comment] - Annotation notes or commentary.
 * @returns {Promise<void>}
 */
export async function createAnnotation({
	fileId,
	title,
	colour,
	start,
	end,
	tags,
	comment
}) {
	try {
		await Meteor.callAsync("annotations.create", {
			fileId,
			title: title.trim(),
			colour,
			start,
			end,
			tags,
			comment
		});
	} catch (err) {
		console.error("Couldn't create annotation", err);
		throw err;
	}
}

/**
 * Updates an existing annotation document.
 *
 * @param {string} annotationId - ID of the annotation to update.
 * @param {object} updates
 * @param {string} updates.title - New title.
 * @param {string} updates.colour - New hex color code.
 * @param {string[]} updates.tags - Updated tags array.
 * @param {string} updates.comment - Updated comment text.
 * @param {number} updates.start - Updated start time in seconds.
 * @param {number|null} updates.end - Updated end time in seconds, or null for timestamps.
 * @returns {Promise<void>}
 */
export async function updateAnnotation(
	annotationId,
	{ title, colour, tags, comment, start, end }
) {
	try {
		await Meteor.callAsync("annotations.update", annotationId, {
			title: title.trim(),
			colour,
			tags,
			comment,
			start,
			end
		});
	} catch (err) {
		console.error("Couldn't update annotation", err);
		throw err;
	}
}
