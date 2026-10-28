import { SessionsCollection } from "./sessionCollection";
import { deleteAudioFile } from "../audio/audioMethods";
import { PresenceCollection } from "../presences/presenceCollection";

// Mongo's duplicate-key error code, thrown when insertAsync is called
// with an _id (fileId) that already has a session doc.
const DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * Creates a collaborative session document for this file if one doesn't exist.
 * Concurrency-safe against race conditions via Mongo duplicate key handling.
 *
 * @param {string} fileId - Workspace file ID.
 * @param {string} hostId - User ID of the host initiating the session.
 * @returns {Promise<void>}
 */
export async function createSessionIfNeeded(fileId, hostId) {
  try {
    await SessionsCollection.insertAsync({
      _id: fileId,
      hostId,
      createdAt: new Date()
    });
  } catch (err) {
    if (err.code !== DUPLICATE_KEY_ERROR_CODE) throw err;
  }
}

/**
 * Checks whether the given user is the designated host of a session.
 *
 * @param {string} fileId - Workspace file ID.
 * @param {string} userId - User ID to test.
 * @returns {Promise<boolean>} True if the user is host, false otherwise.
 */
export async function isHost(fileId, userId) {
  const session = await SessionsCollection.findOneAsync({ _id: fileId });
  return session?.hostId === userId;
}

/**
 * Terminates a session completely, removing the session document,
 * all associated participant presences, and the audio file and its artifacts.
 *
 * @param {string} fileId - Workspace file ID to end.
 * @returns {Promise<void>}
 */
export async function endSession(fileId) {
  await SessionsCollection.removeAsync({ _id: fileId });
  await PresenceCollection.removeAsync({ fileId });
  await deleteAudioFile(fileId);
}
