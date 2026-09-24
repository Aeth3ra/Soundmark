import { Meteor } from "meteor/meteor";

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

export async function deleteEffect(effect) {
  try {
    return await Meteor.callAsync("effects.delete", effect._id);
  } catch (err) {
    console.error("Couldn't delete effect", err);
    throw err;
  }
}