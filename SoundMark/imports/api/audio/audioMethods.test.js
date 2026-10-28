import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";
import { AudioCollection } from "./audioCollection";
import { AnnotationsCollection } from "../annotations/annotationsCollection";
import { EffectsCollection } from "../effects/effectsCollection";
import * as R2 from "./r2";
import "./audioMethods"; // side-effect import: registers the methods
import { deleteAudioFile } from "./audioMethods";

if (Meteor.isServer) {
	describe("audio.methods", function () {
		let sendStub;
		let signedUrlStub;

		beforeEach(async function () {
			await AudioCollection.removeAsync({});

			// r2Client is a real SDK client instance -- `.send` is just a method
			// on that object, so we can stub it directly. This intercepts every
			// Put/Get/DeleteObjectCommand without ever touching the network.
			sendStub = sinon.stub(R2.r2Client, "send").resolves({});

			// getSignedUrl is imported as a bare function inside audioMethods.js.
			// Meteor's ES module system (reify) uses live bindings, so stubbing
			// the property on the *namespace* object (`import * as R2`) also
			// changes what audioMethods.js sees when it calls getSignedUrl(...).
			signedUrlStub = sinon
				.stub(R2.r2Helpers, "getSignedUrl")
				.resolves("https://signed.example.com/fake");
		});

		afterEach(function () {
			// Undo every stub sinon knows about, so a leftover stub from this
			// file can't silently affect an unrelated test file run afterwards.
			sinon.restore();
		});

		describe("audio.getUploadUrl", function () {
			it("builds a PutObjectCommand for the key and inserts a pending record", async function () {
				const result = await Meteor.server.method_handlers[
					"audio.getUploadUrl"
				].apply({}, ["song.mp3", "audio/mpeg"]);

				assert.isTrue(signedUrlStub.calledOnce);

				// Inspect the command object passed to getSignedUrl -- this is how
				// we verify Bucket/Key/ContentType without a real R2 bucket.
				const command = signedUrlStub.firstCall.args[1];
				assert.equal(command.input.Bucket, R2.r2Bucket);
				assert.equal(command.input.ContentType, "audio/mpeg");
				assert.match(command.input.Key, /^audio\/.+-song\.mp3$/);

				assert.equal(
					result.uploadUrl,
					"https://signed.example.com/fake"
				);
				assert.isOk(result.fileId);

				const stored = await AudioCollection.findOneAsync(
					result.fileId
				);
				assert.equal(stored.status, "pending");
				assert.equal(stored.fileName, "song.mp3");
				assert.equal(stored.key, command.input.Key);
			});
		});

		describe("audio.getDownloadUrl", function () {
			it("throws file-not-found for a missing file", async function () {
				try {
					await Meteor.server.method_handlers[
						"audio.getDownloadUrl"
					].apply({}, ["missing-id"]);
					assert.fail("expected the method to throw");
				} catch (err) {
					assert.equal(err.error, "file-not-found");
				}
				assert.isFalse(signedUrlStub.called); // never even asked R2
			});

			it("returns a signed URL built from the file's stored key", async function () {
				const fileId = await AudioCollection.insertAsync({
					key: "audio/abc-song.mp3",
					fileName: "song.mp3"
				});

				const url = await Meteor.server.method_handlers[
					"audio.getDownloadUrl"
				].apply({}, [fileId]);

				assert.equal(url, "https://signed.example.com/fake");
				const command = signedUrlStub.firstCall.args[1];
				assert.equal(command.input.Key, "audio/abc-song.mp3");
			});
		});

		describe("audio.getExportInfo", function () {
			it("throws not-found for a missing file", async function () {
				try {
					await Meteor.server.method_handlers[
						"audio.getExportInfo"
					].apply({}, ["missing-id"]);
					assert.fail("expected the method to throw");
				} catch (err) {
					assert.equal(err.error, "not-found");
				}
			});

			it("returns { url, fileName } for an existing file", async function () {
				const fileId = await AudioCollection.insertAsync({
					key: "audio/abc-song.mp3",
					fileName: "song.mp3"
				});

				const info = await Meteor.server.method_handlers[
					"audio.getExportInfo"
				].apply({}, [fileId]);

				assert.deepEqual(info, {
					url: "https://signed.example.com/fake",
					fileName: "song.mp3"
				});
			});
		});

		describe("audio.deleteFile (method) and deleteAudioFile (helper)", function () {
			it("deletes the R2 object and the Mongo record when the file exists", async function () {
				const fileId = await AudioCollection.insertAsync({
					key: "audio/abc-song.mp3",
					fileName: "song.mp3"
				});

				await Meteor.server.method_handlers["audio.deleteFile"].apply(
					{},
					[fileId]
				);

				assert.isTrue(sendStub.calledOnce);
				const deleteCommand = sendStub.firstCall.args[0];
				assert.equal(deleteCommand.input.Key, "audio/abc-song.mp3");

				const found = await AudioCollection.findOneAsync(fileId);
				assert.isUndefined(found);
			});

			it("does nothing when the file doesn't exist (no R2 call, no throw)", async function () {
				await Meteor.server.method_handlers["audio.deleteFile"].apply(
					{},
					["missing-id"]
				);
				assert.isFalse(sendStub.called);
			});

			it("the exported deleteAudioFile() helper behaves identically", async function () {
				const fileId = await AudioCollection.insertAsync({
					key: "audio/xyz-track.mp3",
					fileName: "track.mp3"
				});

				await deleteAudioFile(fileId);

				assert.isTrue(sendStub.calledOnce);
				const found = await AudioCollection.findOneAsync(fileId);
				assert.isUndefined(found);
			});

			it("deleteAudioFile also removes the file's annotations and effects", async function () {
				const fileId = await AudioCollection.insertAsync({
					key: "audio/x-a.mp3",
					fileName: "a.mp3"
				});
				await AnnotationsCollection.insertAsync({ fileId });
				await EffectsCollection.insertAsync({ fileId });
				await AnnotationsCollection.insertAsync({ fileId: "other" }); // must survive

				await deleteAudioFile(fileId);

				assert.equal(
					await AnnotationsCollection.find({ fileId }).countAsync(),
					0
				);
				assert.equal(
					await EffectsCollection.find({ fileId }).countAsync(),
					0
				);
				assert.equal(
					await AnnotationsCollection.find({
						fileId: "other"
					}).countAsync(),
					1
				);
			});
		});
	});
}
