import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";

/**
 * Resolves a userId -> display name map.
 *
 * Primary source is the published Meteor.users docs (profile.name),
 * populated for a given file via the "annotations.authorsForFile"
 * subscription. Presence data (the current user + anyone else currently
 * active on this file) fills the gap while that subscription is still
 * loading, or for users who haven't set a name via users.setDisplayName.
 *
 * @param {object} params
 * @param {string} [params.fileId] - Included in the dependency list so the
 *   map recomputes when the viewed file changes.
 * @param {Array<{ userId: string, name: string }>} [params.otherUsers] -
 *   Presence entries for everyone else currently active on the file.
 * @param {string} [params.userId] - The current user's id.
 * @param {string} [params.name] - The current user's display name.
 * @returns {Record<string, string>} userId -> display name
 */
export const useUserNames = ({ fileId, otherUsers = [], userId, name }) => {
  return useTracker(() => {
    const map = {};

    Meteor.users.find({}, { fields: { "profile.name": 1 } }).forEach((u) => {
      if (u.profile?.name) map[u._id] = u.profile.name;
    });

    otherUsers.forEach((u) => {
      if (!map[u.userId]) map[u.userId] = u.name;
    });

    if (userId && !map[userId]) map[userId] = name;

    return map;
  }, [fileId, otherUsers, userId, name]);
};
