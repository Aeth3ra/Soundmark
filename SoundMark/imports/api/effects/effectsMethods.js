import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { EffectsCollection } from "./effectsCollection";
import { AudioCollection } from "../audio/audioCollection";
import { isHost } from "../sessions/sessionMethods";

/**
 * Validates region boundaries, ordering, and parameter ranges for a DSP effect.
 *
 * @param {object} effect
 * @param {string} effect.type - Effect type.
 * @param {number} effect.start - Region start in seconds.
 * @param {number} effect.end - Region end in seconds.
 * @param {object} effect.params - Effect parameter map.
 * @param {number} effect.order - Execution order index.
 * @param {number} [durationSeconds] - Optional total audio duration cap.
 * @throws {Meteor.Error} If boundaries, order, or parameters are out of bounds.
 */
function validateEffect({ type, start, end, params, order }, durationSeconds) {
	if (
		!Number.isFinite(start) ||
		!Number.isFinite(end) ||
		start < 0 ||
		end <= start
	) {
		throw new Meteor.Error(
			"invalid-time",
			"Use finite times with 0 <= start < end."
		);
	}

	// Current audio records do not store durationSeconds
	// Also check the actual decoded duration when applying the effect
	if (Number.isFinite(durationSeconds) && end > durationSeconds) {
		throw new Meteor.Error(
			"invalid-time",
			"The effect ends after the audio."
		);
	}

	if (!Number.isSafeInteger(order) || order < 0) {
		throw new Meteor.Error(
			"invalid-order",
			"Effect order must be a non-negative integer."
		);
	}

	if (type === "normalize") {
		check(params, { targetPeakDb: Number });

		if (
			!Number.isFinite(params.targetPeakDb) ||
			params.targetPeakDb < -6 ||
			params.targetPeakDb > 0
		) {
			throw new Meteor.Error(
				"invalid-params",
				"Use a target peak between -6 dB and 0 dB."
			);
		}
	} else if (type === "amplify") {
		check(params, { gainDb: Number });

		if (
			!Number.isFinite(params.gainDb) ||
			params.gainDb < -24 ||
			params.gainDb > 24
		) {
			throw new Meteor.Error(
				"invalid-params",
				"Use an amplification gain between -24 dB and +24 dB."
			);
		}
	} else if (type === "pitchShift") {
		check(params, { semitones: Number });

		if (
			!Number.isFinite(params.semitones) ||
			params.semitones < -24 ||
			params.semitones > 24
		) {
			throw new Meteor.Error(
				"invalid-params",
				"Pitch shift must be between -24 and 24 semitones."
			);
		}
	} else if (type === "filter") {
		check(params, {
			filterType: String,
			frequency: Number
		});

		if (
			(params.filterType !== "lowpass" &&
				params.filterType !== "highpass") ||
			!Number.isFinite(params.frequency) ||
			params.frequency <= 0 ||
			params.frequency > 24000
		) {
			throw new Meteor.Error(
				"invalid-params",
				"Filter frequency must be between 1 and 24000 Hz, and the filter must be low-pass or high-pass."
			);
		}
	} else {
		throw new Meteor.Error("invalid-effect", "Unsupported effect type.");
	}
}

Meteor.methods({
	/**
	 * Creates an audio effect region on an audio track.
	 *
	 * @param {object} params
	 * @param {string} params.fileId - Target audio file ID.
	 * @param {"normalize"|"amplify"|"pitchShift"|"filter"} params.type - Effect type.
	 * @param {number} params.start - Region start in seconds.
	 * @param {number} params.end - Region end in seconds.
	 * @param {object} params.params - Validated parameter object for the effect type.
	 * @param {boolean} [params.enabled=true] - Active flag.
	 * @param {number} [params.order=0] - Render pipeline order index.
	 * @returns {Promise<string>} Mongo ID of the inserted effect document.
	 * @throws {Meteor.Error} "not-authorized" if unauthenticated, "audio-not-found" if missing audio.
	 */
	async "effects.create"({
		fileId,
		type,
		start,
		end,
		params,
		enabled = true,
		order = 0
	}) {
		if (!this.userId) {
			throw new Meteor.Error("not-authorized", "Must be logged in.");
		}

		check(fileId, String);
		check(type, String);
		check(start, Number);
		check(end, Number);
		check(params, Object);
		check(enabled, Boolean);
		check(order, Number);

		const audioFile = await AudioCollection.findOneAsync(fileId);

		if (!audioFile) {
			throw new Meteor.Error(
				"audio-not-found",
				"The audio file does not exist."
			);
		}

		validateEffect(
			{ type, start, end, params, order },
			audioFile.durationSeconds
		);

		return await EffectsCollection.insertAsync({
			fileId,
			type,
			start,
			end,
			params,
			enabled,
			order,
			createdBy: this.userId,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	},

	/**
	 * Updates an effect's region boundaries, parameters, or enabled state.
	 * Only allowed by the original creator or the session host.
	 *
	 * @param {string} effectId - Target effect ID.
	 * @param {object} updates - Fields to update.
	 * @returns {Promise<number>} Number of modified documents.
	 * @throws {Meteor.Error} "not-authorized" if caller is neither creator nor host.
	 */
	async "effects.update"(effectId, updates) {
		if (!this.userId) {
			throw new Meteor.Error("not-authorized", "Must be logged in.");
		}

		check(effectId, String);
		check(updates, {
			start: Number,
			end: Number,
			params: Object,
			enabled: Boolean,
			order: Number
		});

		const effect = await EffectsCollection.findOneAsync(effectId);

		if (!effect) {
			throw new Meteor.Error(
				"effect-not-found",
				"The effect does not exist."
			);
		}

		if (
			effect.createdBy !== this.userId &&
			!(await isHost(effect.fileId, this.userId))
		) {
			throw new Meteor.Error(
				"not-authorized",
				"Only the creator or session host can edit this effect."
			);
		}

		const audioFile = await AudioCollection.findOneAsync(effect.fileId);
		if (!audioFile) {
			throw new Meteor.Error(
				"audio-not-found",
				"The audio file does not exist."
			);
		}

		validateEffect(
			{ type: effect.type, ...updates },
			audioFile.durationSeconds
		);

		return await EffectsCollection.updateAsync(effectId, {
			$set: {
				start: updates.start,
				end: updates.end,
				params: updates.params,
				enabled: updates.enabled,
				order: updates.order,
				updatedAt: new Date()
			}
		});
	},

	/**
	 * Deletes an effect document. Only permitted by the creator or session host.
	 *
	 * @param {string} effectId - Target effect ID.
	 * @returns {Promise<number>} Number of removed documents.
	 * @throws {Meteor.Error} "not-authorized" if caller is neither creator nor host.
	 */
	async "effects.delete"(effectId) {
		if (!this.userId) {
			throw new Meteor.Error("not-authorized", "Must be logged in.");
		}

		check(effectId, String);

		const effect = await EffectsCollection.findOneAsync(effectId);
		if (!effect) return;

		if (
			effect.createdBy !== this.userId &&
			!(await isHost(effect.fileId, this.userId))
		) {
			throw new Meteor.Error(
				"not-authorized",
				"Only the creator or session host can delete this effect."
			);
		}

		return await EffectsCollection.removeAsync(effectId);
	}
});
