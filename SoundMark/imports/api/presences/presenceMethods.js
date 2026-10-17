import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { PresenceCollection } from "./presenceCollection";
import { SessionsCollection } from "../sessions/sessionCollection";
import {
	createSessionIfNeeded,
	isHost,
	endSession
} from "../sessions/sessionMethods";

// connectionId -> { fileId, userId }
// Tracks which workspace/user a live DDP connection is presenting as,
// so we can clean up the instant that connection actually closes -
// which happens on real tab-close/navigation, but NOT just from a tab
// being backgrounded. This is the primary way presence goes away now.
const connectionPresence = new Map();

// Catch Leaks
const STALE_MS = 5 * 60 * 1000; // 5 minutes
const SWEEP_INTERVAL_MS = 15000;
Meteor.methods({
	/**
	 * Upserts the calling guest's live position for a given file/workspace.
	 * userId/name come from the authenticated session
	 */
	async "presence.update"({
		fileId,
		position,
		isPlaying,
		followingUserId,
		playbackRate
	}) {
		if (!this.userId) {
			throw new Meteor.Error("not-authorized", "Must be logged in.");
		}

		check(fileId, String);
		check(position, Number);
		check(isPlaying, Match.Optional(Boolean));
		check(followingUserId, Match.Maybe(Match.OneOf(String, null)));
		check(playbackRate, Match.Optional(Number));

		const user = await Meteor.users.findOneAsync(this.userId);
		const name = user?.profile?.name || "Guest";

		const existingSession = await SessionsCollection.findOneAsync({
			_id: fileId
		});
		const existingPresencesCount = await PresenceCollection.find({
			fileId
		}).countAsync();

		// Only allow creating a session if ZERO presences exist (brand new room creation).
		// If the session was deleted by the host but other users are still being kicked
		// out, reject the update so they don't recreate the session or claim host status.
		if (!existingSession) {
			if (existingPresencesCount > 0) return;
			await createSessionIfNeeded(fileId, this.userId);
		}

		await PresenceCollection.upsertAsync(
			{ fileId, userId: this.userId },
			{
				$set: {
					name,
					position,
					isPlaying: Boolean(isPlaying),
					followingUserId: followingUserId || null,
					updatedAt: new Date(),
					connectionId: this.connection.id,
					playbackRate:
						typeof playbackRate === "number" ? playbackRate : 1
				}
			}
		);

		// Tie this connection to this fileId/user - if the connection
		// closes for real, connection.onClose above handles cleanup.
		connectionPresence.set(this.connection.id, {
			fileId,
			userId: this.userId
		});
	},

	/**
	 * Removes the calling guest's doc for a file. Best-effort - call on
	 * unmount/navigation, but don't rely on it alone (see STALE_MS cleanup).
	 */
	async "presence.leave"(payload) {
		if (!this.userId) return;

		check(payload, { fileId: String });

		const { fileId } = payload;

		connectionPresence.delete(this.connection.id);

		if (await isHost(fileId, this.userId)) {
			await endSession(fileId);
			return;
		}

		await PresenceCollection.removeAsync({ fileId, userId: this.userId });
	}
});

/**
 * Best-effort cleanup for guests (including hosts) who disconnected
 * without a clean "presence.leave" call.
 */
export async function cleanupStalePresence() {
	const cutoff = new Date(Date.now() - STALE_MS);
	const staleDocs = await PresenceCollection.find({
		updatedAt: { $lt: cutoff }
	}).fetchAsync();

	if (staleDocs.length === 0) return;

	const staleByFile = new Map();
	staleDocs.forEach((doc) => {
		if (!staleByFile.has(doc.fileId)) staleByFile.set(doc.fileId, []);
		staleByFile.get(doc.fileId).push(doc);
	});

	const isOrphaned = (doc) => {
		const tracked = connectionPresence.get(doc.connectionId);
		return !tracked; // no live connection is claiming this doc
	};

	for (const [fileId, docs] of staleByFile) {
		const orphanedDocs = docs.filter(isOrphaned);
		if (orphanedDocs.length === 0) continue;
		const staleUserIds = docs.map((d) => d.userId);
		const hostWentStale = (
			await Promise.all(staleUserIds.map((uid) => isHost(fileId, uid)))
		).some(Boolean);

		if (hostWentStale) {
			await endSession(fileId);
		} else {
			await PresenceCollection.removeAsync({
				_id: { $in: docs.map((d) => d._id) }
			});
		}
	}
}

if (Meteor.isServer) {
	// Catch here so a failed sweep (e.g. R2 unreachable) can't crash the server.
	Meteor.setInterval(() => {
		cleanupStalePresence().catch((err) => {
			console.error("stale presence cleanup failed", err);
		});
	}, SWEEP_INTERVAL_MS);
}

if (Meteor.isServer) {
	Meteor.onConnection((connection) => {
		connection.onClose(async () => {
			const info = connectionPresence.get(connection.id);
			connectionPresence.delete(connection.id);
			if (!info) return;

			const { fileId, userId } = info;
			try {
				if (await isHost(fileId, userId)) {
					await endSession(fileId);
				} else {
					await PresenceCollection.removeAsync({ fileId, userId });
				}
			} catch (err) {
				console.error(
					"presence cleanup on connection close failed",
					err
				);
			}
		});
	});
}
