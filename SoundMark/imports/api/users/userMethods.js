import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";

Meteor.methods({
  /**
   * Sets the display name on the authenticated user's account profile.
   *
   * @param {string} name - Desired display name.
   * @returns {Promise<void>}
   * @throws {Meteor.Error} "not-authorized" if unauthenticated, "invalid-name" if blank.
   */
  async "user.setDisplayName"(name) {
    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "Must be logged in.");
    }

    check(name, String);
    const trimmed = name.trim();

    if (!trimmed) {
      throw new Meteor.Error("invalid-name", "Name cannot be empty.");
    }

    await Meteor.users.updateAsync(this.userId, {
      $set: { "profile.name": trimmed }
    });
  },

  /**
   * Returns the current authenticated user's profile display name.
   *
   * @returns {Promise<string|null>} Profile name, or null if unauthenticated.
   */
  async "user.get"() {
    if (!this.userId) return null;
    const user = await Meteor.users.findOneAsync(this.userId, {
      fields: { profile: 1 }
    });
    return user?.profile?.name || null;
  }
});
