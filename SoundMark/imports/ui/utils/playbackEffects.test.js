import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import { getPlaybackEffects } from "./playbackEffects";

if (Meteor.isClient) {
	describe("getPlaybackEffects", function () {
		it("mutes only selected active collaborator effects without changing saved effects", function () {
			const effects = [
				{ _id: "mine", createdBy: "me", enabled: true },
				{ _id: "theirs", createdBy: "other", enabled: true },
				{ _id: "disabled", createdBy: "other", enabled: false }
			];
			const playback = getPlaybackEffects(
				effects,
				new Set(["mine", "theirs", "disabled"]),
				"me"
			);

			assert.deepEqual(playback.map((effect) => effect.enabled), [
				true,
				false,
				false
			]);
			assert.isTrue(effects[1].enabled);
			assert.strictEqual(playback[0], effects[0]);
			assert.strictEqual(playback[2], effects[2]);
			assert.strictEqual(
				getPlaybackEffects(effects, new Set(), "me"),
				effects
			);
		});
	});
}
