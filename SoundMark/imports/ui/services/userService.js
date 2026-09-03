import { Meteor } from "meteor/meteor";

/**
 * Updates the current user's display name.
 * @param {string} name
 */
export async function setDisplayName(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Enter a name to continue.");
  }

  try {
    await Meteor.callAsync("users.setDisplayName", trimmed);
  } catch (err) {
    throw new Error("Couldn't save your name. Try again.");
  }
}
