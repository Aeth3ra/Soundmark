import { SessionsCollection } from "./sessionCollection";
import { deleteAudioFile } from "../audio/audioMethods";
import { PresenceCollection } from "../presences/presenceCollection";

// Mongo's duplicate-key error code, thrown when insertAsync is called
// with an _id (fileId) that already has a session doc.
const DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * Creates a session doc for this file if one doesn't already exist.
 * Safe to call concurrently - a duplicate-key error just means someone
 * else's call won the race, which is fine (session already exists).
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

/** Whether the given user is the host of the given file's session. */
export async function isHost(fileId, userId) {
  const session = await SessionsCollection.findOneAsync({ _id: fileId });
  return session?.hostId === userId;
}

/**
 * Ends a file's collaborative session entirely: removes the session
 * record, everyone's presence doc for that file, and the audio file
 * itself. Only ever called once we've established the departing/expired
 * user was the host.
 */
export async function endSession(fileId) {
  await SessionsCollection.removeAsync({ _id: fileId });
  await PresenceCollection.removeAsync({ fileId });
  await deleteAudioFile(fileId);
}
