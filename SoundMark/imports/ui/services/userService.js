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
    await Meteor.callAsync("user.setDisplayName", trimmed);
  } catch (err) {
    throw new Error("Couldn't save your name. Try again.");
  }
}

/**
 * Pings meteor's user DB to get current user client is using.
 */
export async function getUser() {
  try {
    const user = await Meteor.callAsync("user.get");
    return user;
  } catch (err) {
    throw new Error("Couldn't find user. Try again.");
  }
}
