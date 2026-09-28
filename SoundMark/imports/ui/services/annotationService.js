import { Meteor } from "meteor/meteor";

export async function deleteAnnotation(annotation) {
	try {
		await Meteor.callAsync("annotations.delete", annotation._id);
	} catch (err) {
		console.error("Couldn't delete annotation", err);
	}
}

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
