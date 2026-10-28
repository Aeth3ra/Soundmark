import { Meteor } from "meteor/meteor";

/**
 * Updates the current logged-in user's display name.
 *
 * @param {string} name - New display name.
 * @returns {Promise<void>}
 * @throws {Error} If name is empty or save fails.
 */
export async function setDisplayName(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Enter a name to continue.");
  }

  try {
    await Meteor.callAsync("user.setDisplayName", trimmed);
  } catch {
    throw new Error("Couldn't save your name. Try again.");
  }
}

/**
 * Fetches the current logged-in user's profile name from the server.
 *
 * @returns {Promise<string|null>} Profile name, or null if unauthenticated.
 * @throws {Error} If the server call fails.
 */
export async function getUser() {
  try {
    const user = await Meteor.callAsync("user.get");
    return user;
  } catch {
    throw new Error("Couldn't find user. Try again.");
  }
}
