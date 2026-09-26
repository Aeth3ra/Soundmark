import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";
import { PresenceCollection } from "./presenceCollection";
import { SessionsCollection } from "../sessions/sessionCollection";
import { AudioCollection } from "../audio/audioCollection";
import "./presenceMethods"; // side-effect import: registers the methods
import { cleanupStalePresence } from "./presenceMethods";

if (Meteor.isServer) {
	describe("presence.methods", function () {
		const userId = "testUser1";
		const fileId = "file-1";

		// Generating unique connection IDs for each test prevents state leakage
		// into the module-scoped connectionPresence Map between tests.
		let connIdCounter = 0;
		let mockContext;
		let unauthContext;

		beforeEach(async function () {
			await PresenceCollection.removeAsync({});
			await SessionsCollection.removeAsync({});
			await AudioCollection.removeAsync({});
			await Meteor.users.removeAsync({});

			connIdCounter++;
			mockContext = {
				userId,
				connection: { id: `conn-${connIdCounter}` }
			};
			unauthContext = {
				userId: null,
				connection: { id: `conn-unauth-${connIdCounter}` }
			};
		});

		afterEach(function () {
			sinon.restore();
		});

		describe("presence.update", function () {
			it("throws not-authorized when no user is logged in", async function () {
				try {
					await Meteor.server.method_handlers[
						"presence.update"
					].apply(unauthContext, [
						{ fileId, position: 0, isPlaying: false }
					]);
					assert.fail("expected the method to throw");
				} catch (err) {
					assert.equal(err.error, "not-authorized");
				}
			});

			it("rejects a payload that doesn't match the expected shape", async function () {
				try {
					await Meteor.server.method_handlers[
						"presence.update"
					].apply(
						mockContext,
						[{ fileId }] // missing `position`
					);
					assert.fail("expected the method to throw");
				} catch (err) {
					assert.match(err.message, /Match error/);
				}
			});

			it("rejects invalid types for isPlaying", async function () {
				try {
					await Meteor.server.method_handlers[
						"presence.update"
					].apply(mockContext, [
						{ fileId, position: 10, isPlaying: "not-a-boolean" }
					]);
					assert.fail("expected the method to throw");
				} catch (err) {
					assert.match(err.message, /Match error/);
				}
			});

			it("rejects invalid types for followingUserId", async function () {
				try {
					await Meteor.server.method_handlers[
						"presence.update"
					].apply(mockContext, [
						{ fileId, position: 10, followingUserId: 12345 }
					]);
					assert.fail("expected the method to throw");
				} catch (err) {
					assert.match(err.message, /Match error/);
				}
			});

			it("rejects invalid types for playbackRate", async function () {
				try {
					await Meteor.server.method_handlers[
						"presence.update"
					].apply(mockContext, [
						{ fileId, position: 10, playbackRate: "fast" }
					]);
					assert.fail("expected the method to throw");
				} catch (err) {
					assert.match(err.message, /Match error/);
				}
			});

			it("creates a new session and marks the caller as host when the room is empty", async function () {
				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[
						{
							fileId,
							position: 12,
							isPlaying: true,
							playbackRate: 1.5,
							followingUserId: "targetUser"
						}
					]
				);

				const session = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.isOk(session);
				assert.equal(session.hostId, userId);

				const presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.isOk(presence);
				assert.equal(presence.position, 12);
				assert.strictEqual(presence.isPlaying, true);
				assert.equal(presence.playbackRate, 1.5);
				assert.equal(presence.followingUserId, "targetUser");
				assert.equal(presence.name, "Guest"); // no profile.name set on this user
				assert.equal(presence.connectionId, mockContext.connection.id); // Verifies connectionId mapping
			});

			it("defaults isPlaying to false, playbackRate to 1, and followingUserId to null when omitted", async function () {
				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 5 }]
				);

				const presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.isOk(presence);
				assert.strictEqual(presence.isPlaying, false);
				assert.strictEqual(presence.playbackRate, 1);
				assert.strictEqual(presence.followingUserId, null);
			});

			it("persists updates when isPlaying toggles between true and false", async function () {
				// First update: playing
				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 15, isPlaying: true }]
				);

				let presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.strictEqual(presence.isPlaying, true);

				// Second update: paused
				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 15, isPlaying: false }]
				);

				presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.strictEqual(presence.isPlaying, false);
			});

			it("persists updates when playbackRate changes", async function () {
				// First update: default rate
				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 15, playbackRate: 1 }]
				);

				let presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.strictEqual(presence.playbackRate, 1);

				// Second update: sped up
				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 15, playbackRate: 2 }]
				);

				presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.strictEqual(presence.playbackRate, 2);
			});

			it("persists updating and clearing followingUserId", async function () {
				// Set followingUserId
				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 5, followingUserId: "followedUser" }]
				);

				let presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.equal(presence.followingUserId, "followedUser");

				// Clear followingUserId (set to null)
				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 5, followingUserId: null }]
				);

				presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.strictEqual(presence.followingUserId, null);
			});

			it("uses the user's profile name when available", async function () {
				await Meteor.users.insertAsync({
					_id: userId,
					profile: { name: "Alice" }
				});

				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 1, isPlaying: false }]
				);

				const presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.equal(presence.name, "Alice");
			});

			it("does not create a second session or change the host when one already exists", async function () {
				await SessionsCollection.insertAsync({
					_id: fileId,
					hostId: "original-host",
					createdAt: new Date()
				});

				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 5, isPlaying: false }]
				);

				const session = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.equal(session.hostId, "original-host"); // unchanged

				const presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.isOk(presence); // the joining guest still gets recorded
			});

			it("drops the update without creating a session when the room is mid-teardown", async function () {
				await PresenceCollection.insertAsync({
					fileId,
					userId: "still-leaving-user",
					name: "Leftover",
					updatedAt: new Date()
				});

				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 5, isPlaying: false }]
				);

				const session = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.isUndefined(session); // no session was created

				const newPresence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.isUndefined(newPresence); // the caller's own update was silently dropped
			});

			it("survives a concurrent session-insert race (duplicate key error)", async function () {
				await SessionsCollection.insertAsync({
					_id: fileId,
					hostId: "other-user",
					createdAt: new Date()
				});
				sinon.stub(SessionsCollection, "findOneAsync").resolves(null);

				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 1, isPlaying: false }]
				);

				sinon.restore(); // stop stubbing before reading real state back

				const session = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.equal(session.hostId, "other-user"); // untouched by our failed insert

				const presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.isOk(presence); // presence still gets recorded despite the race
			});
		});

		describe("presence.leave", function () {
			it("does nothing when no user is logged in", async function () {
				await Meteor.server.method_handlers["presence.leave"].apply(
					unauthContext,
					[{ fileId }]
				);
			});

			it("removes only the caller's own presence doc when they are not the host", async function () {
				await SessionsCollection.insertAsync({
					_id: fileId,
					hostId: "the-host",
					createdAt: new Date()
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId,
					name: "Me"
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId: "the-host",
					name: "Host"
				});

				await Meteor.server.method_handlers["presence.leave"].apply(
					mockContext,
					[{ fileId }]
				);

				const mine = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.isUndefined(mine);

				const hosts = await PresenceCollection.findOneAsync({
					fileId,
					userId: "the-host"
				});
				assert.isOk(hosts); // the host's presence is untouched

				const session = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.isOk(session); // session survives a non-host leaving
			});

			it("ends the session entirely when the host leaves", async function () {
				await SessionsCollection.insertAsync({
					_id: fileId,
					hostId: userId,
					createdAt: new Date()
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId,
					name: "Host"
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId: "a-guest",
					name: "Guest"
				});

				await Meteor.server.method_handlers["presence.leave"].apply(
					mockContext,
					[{ fileId }]
				);

				const session = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.isUndefined(session);

				const remainingPresences = await PresenceCollection.find({
					fileId
				}).countAsync();
				assert.equal(remainingPresences, 0); // everyone's presence cleared, not just the host's
			});

			it("ending the session is safe even with no matching audio file to delete", async function () {
				await SessionsCollection.insertAsync({
					_id: fileId,
					hostId: userId,
					createdAt: new Date()
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId,
					name: "Host"
				});

				await Meteor.server.method_handlers["presence.leave"].apply(
					mockContext,
					[{ fileId }]
				);
			});
		});

		describe("cleanupStalePresence", function () {
			function staleDate(msAgo) {
				return new Date(Date.now() - msAgo);
			}

			it("leaves fresh (non-stale) presence docs untouched", async function () {
				await SessionsCollection.insertAsync({
					_id: fileId,
					hostId: userId,
					createdAt: new Date()
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId,
					name: "Host",
					updatedAt: staleDate(1000)
				});

				await cleanupStalePresence();

				const presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.isOk(presence);
				const session = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.isOk(session);
			});

			it("leaves a stale document if it is still claimed by a live connection", async function () {
				// Registering via the method natively inserts the connection into the connectionPresence map
				await Meteor.server.method_handlers["presence.update"].apply(
					mockContext,
					[{ fileId, position: 1 }]
				);

				// Artificially make the document stale (> 5 mins)
				await PresenceCollection.updateAsync(
					{ fileId, userId },
					{ $set: { updatedAt: staleDate(400000) } }
				);

				await cleanupStalePresence();

				// Because the connection id is still present in `connectionPresence`, it shouldn't be orphaned
				const presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.isOk(presence);

				// Clean up Map internally using leave
				await Meteor.server.method_handlers["presence.leave"].apply(
					mockContext,
					[{ fileId }]
				);
			});

			it("removes a stale guest's presence without ending the session", async function () {
				await SessionsCollection.insertAsync({
					_id: fileId,
					hostId: "the-host",
					createdAt: new Date()
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId: "the-host",
					name: "Host",
					updatedAt: staleDate(1000) // Fresh
				});

				await PresenceCollection.insertAsync({
					fileId,
					userId: "stale-guest",
					name: "Guest",
					updatedAt: staleDate(400000) // Stale (> 5 mins)
				});

				await cleanupStalePresence();

				const guest = await PresenceCollection.findOneAsync({
					fileId,
					userId: "stale-guest"
				});
				assert.isUndefined(guest);

				const host = await PresenceCollection.findOneAsync({
					fileId,
					userId: "the-host"
				});
				assert.isOk(host);

				const session = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.isOk(session);
			});

			it("ends the whole session when the host goes stale", async function () {
				await SessionsCollection.insertAsync({
					_id: fileId,
					hostId: userId,
					createdAt: new Date()
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId,
					name: "Host",
					updatedAt: staleDate(400000) // Stale (> 5 mins)
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId: "a-guest",
					name: "Guest",
					updatedAt: staleDate(1000) // Fresh
				});

				await cleanupStalePresence();

				const session = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.isUndefined(session);

				const remaining = await PresenceCollection.find({
					fileId
				}).countAsync();
				assert.equal(remaining, 0);
			});

			it("handles multiple files with stale docs independently in one pass", async function () {
				const otherFileId = "file-2";

				await SessionsCollection.insertAsync({
					_id: fileId,
					hostId: "host-a",
					createdAt: new Date()
				});
				await SessionsCollection.insertAsync({
					_id: otherFileId,
					hostId: "host-b",
					createdAt: new Date()
				});

				await PresenceCollection.insertAsync({
					fileId,
					userId: "host-a",
					name: "Host A",
					updatedAt: staleDate(1000) // Fresh
				});
				await PresenceCollection.insertAsync({
					fileId,
					userId: "stale-guest",
					name: "Guest",
					updatedAt: staleDate(400000) // Stale
				});

				await PresenceCollection.insertAsync({
					fileId: otherFileId,
					userId: "host-b",
					name: "Host B",
					updatedAt: staleDate(400000) // Stale
				});

				await cleanupStalePresence();

				const session1 = await SessionsCollection.findOneAsync({
					_id: fileId
				});
				assert.isOk(session1);
				const guest1 = await PresenceCollection.findOneAsync({
					fileId,
					userId: "stale-guest"
				});
				assert.isUndefined(guest1);

				const session2 = await SessionsCollection.findOneAsync({
					_id: otherFileId
				});
				assert.isUndefined(session2);
			});

			it("does nothing when there are no stale docs at all", async function () {
				await PresenceCollection.insertAsync({
					fileId,
					userId,
					name: "Host",
					updatedAt: staleDate(1000)
				});

				await cleanupStalePresence();

				const presence = await PresenceCollection.findOneAsync({
					fileId,
					userId
				});
				assert.isOk(presence);
			});
		});
	});
}
