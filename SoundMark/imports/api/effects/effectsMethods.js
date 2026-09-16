import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { EffectsCollection } from "./effectsCollection";
import { AudioCollection } from "../audio/audioCollection";
import { isHost } from "../sessions/sessionMethods";

// Validation for creating and updating effects
function validateEffect(
  { type, start, end, params, order },
  durationSeconds
) {
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

  // Runs when duration metadata is available.
  if (
    Number.isFinite(durationSeconds) &&
    end > durationSeconds
  ) {
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
    check(params, {
      mode: String,
      targetDbFS: Number
    });

    if (
      params.mode !== "peak" ||
      !Number.isFinite(params.targetDbFS) ||
      params.targetDbFS < -60 ||
      params.targetDbFS > 0
    ) {
      throw new Meteor.Error(
        "invalid-params",
        "Use peak normalisation with a target between -60 and 0 dBFS."
      );
    }
  } else if (type === "pitchShift") {
    check(params, {
      semitones: Number
    });

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
  } else {
    throw new Meteor.Error(
      "invalid-effect",
      "Unsupported effect type."
    );
  }
}

Meteor.methods({
  /**
   * Method to create an effect for an audio file.
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
      throw new Meteor.Error(
        "not-authorized",
        "Must be logged in."
      );
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
   * Method to update an effect's editable settings.
   */
  async "effects.update"(effectId, updates) {
    if (!this.userId) {
      throw new Meteor.Error(
        "not-authorized",
        "Must be logged in."
      );
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

    const audioFile = await AudioCollection.findOneAsync(
      effect.fileId
    );

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
   * Method to delete an effect.
   */
  async "effects.delete"(effectId) {
    if (!this.userId) {
      throw new Meteor.Error(
        "not-authorized",
        "Must be logged in."
      );
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