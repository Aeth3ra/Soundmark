import { Meteor } from "meteor/meteor";

/**
 * Creates a new DSP effect record for an audio track.
 *
 * @param {object} params
 * @param {string} params.fileId - Target audio file ID.
 * @param {string} params.type - Effect type ("normalize", "amplify", "pitchShift", "filter").
 * @param {number} params.start - Region start in seconds.
 * @param {number} params.end - Region end in seconds.
 * @param {object} params.params - Effect-specific parameters.
 * @param {boolean} [params.enabled=true] - Whether the effect is active.
 * @param {number} [params.order=0] - Processing order index.
 * @returns {Promise<string>} Mongo ID of the created effect.
 */
export async function createEffect({
  fileId,
  type,
  start,
  end,
  params,
  enabled = true,
  order = 0
}) {
  try {
    return await Meteor.callAsync("effects.create", {
      fileId,
      type,
      start,
      end,
      params,
      enabled,
      order
    });
  } catch (err) {
    console.error("Couldn't create effect", err);
    throw err;
  }
}

/**
 * Updates properties and parameters of an existing effect.
 *
 * @param {string} effectId - ID of the effect document to update.
 * @param {object} updates
 * @param {number} updates.start - New start time in seconds.
 * @param {number} updates.end - New end time in seconds.
 * @param {object} updates.params - New parameter object.
 * @param {boolean} updates.enabled - Enabled toggle.
 * @param {number} updates.order - Execution sequence order.
 * @returns {Promise<number>} Number of updated documents.
 */
export async function updateEffect(effectId, {
  start,
  end,
  params,
  enabled,
  order
}) {
  try {
    return await Meteor.callAsync("effects.update", effectId, {
      start,
      end,
      params,
      enabled,
      order
    });
  } catch (err) {
    console.error("Couldn't update effect", err);
    throw err;
  }
}

/**
 * Deletes an effect document.
 *
 * @param {{ _id: string }} effect - Effect document to remove.
 * @returns {Promise<number>} Number of removed documents.
 */
export async function deleteEffect(effect) {
  try {
    return await Meteor.callAsync("effects.delete", effect._id);
  } catch (err) {
    console.error("Couldn't delete effect", err);
    throw err;
  }
}