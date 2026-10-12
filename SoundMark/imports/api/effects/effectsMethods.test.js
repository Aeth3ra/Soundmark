import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import { EffectsCollection } from "./effectsCollection";
import { AudioCollection } from "../audio/audioCollection";
import { SessionsCollection } from "../sessions/sessionCollection";
import "./effectsMethods";

if (Meteor.isServer) {
  describe("effects.methods", function () {
    const userId = "testUser1";
    const hostId = "hostUser";
    let input, updates, effectId, original;

    const callMethod = (name, args, caller = userId) =>
      Meteor.server.method_handlers[name].apply({ userId: caller }, args);

    async function expectError(name, args, expected, caller = userId) {
      try {
        await callMethod(name, args, caller);
        assert.fail("expected the method to throw");
      } catch (err) {
        if (expected instanceof RegExp) assert.match(err.message, expected);
        else assert.equal(err.error, expected);
      }
    }

    beforeEach(async function () {
      await EffectsCollection.removeAsync({});
      await AudioCollection.removeAsync({});
      await SessionsCollection.removeAsync({});

      const fileId = await AudioCollection.insertAsync({
        name: "test.mp3", durationSeconds: 10
      });
      input = {
        fileId, type: "normalize", start: 1, end: 5,
        params: { targetPeakDb: -1 }
      };
      updates = {
        start: 2, end: 6, params: { targetPeakDb: -3 },
        enabled: false, order: 1
      };
      effectId = await EffectsCollection.insertAsync({
        ...input, enabled: true, order: 0, createdBy: userId,
        createdAt: new Date("2000-01-01"),
        updatedAt: new Date("2000-01-01")
      });
      original = await EffectsCollection.findOneAsync(effectId);
      await SessionsCollection.insertAsync({ _id: fileId, hostId });
      await SessionsCollection.insertAsync({
        _id: "other-file", hostId: "other-host"
      });
    });

    describe("effects.create", function () {
      it("inserts an effect with defaults, timestamps, and the caller's userId", async function () {
        const id = await callMethod("effects.create", [
          { ...input, createdBy: "someone-else" }
        ]);
        const effect = await EffectsCollection.findOneAsync(id);

        assert.notEqual(id, effectId);
        assert.deepEqual(effect, {
          ...input, _id: id, enabled: true, order: 0, createdBy: userId,
          createdAt: effect.createdAt, updatedAt: effect.updatedAt
        });
        assert.instanceOf(effect.createdAt, Date);
        assert.instanceOf(effect.updatedAt, Date);
      });

      it("accepts the other effect types and explicit enabled/order values", async function () {
        const cases = [
          ["amplify", { gainDb: 6 }],
          ["pitchShift", { semitones: 12 }],
          ["filter", { filterType: "lowpass", frequency: 1000 }],
          ["filter", { filterType: "highpass", frequency: 1000 }]
        ];
        for (const [type, params] of cases) {
          const id = await callMethod("effects.create", [
            { ...input, type, params, enabled: false, order: 2 }
          ]);
          const effect = await EffectsCollection.findOneAsync(id);

          assert.equal(effect.type, type);
          assert.deepEqual(effect.params, params);
          assert.isFalse(effect.enabled);
          assert.equal(effect.order, 2);
        }
      });

      it("requires a logged-in user", async function () {
        await expectError("effects.create", [input], "not-authorized", null);
        assert.lengthOf(await EffectsCollection.find({}).fetchAsync(), 1);
      });

      const invalidInputs = [
        ["missing audio", { fileId: "missing" }, "audio-not-found"],
        ["wrong argument types", { start: "bad" }, /Match error/],
        ["unsupported effects", { type: "reverb" }, "invalid-effect"],
        ["negative times", { start: -1 }, "invalid-time"],
        ["reversed times", { end: 0 }, "invalid-time"],
        ["non-finite times", { end: Infinity }, "invalid-time"],
        ["times beyond the audio", { end: 11 }, "invalid-time"],
        ["invalid order", { order: -1 }, "invalid-order"],
        ["invalid normalization", { params: { targetPeakDb: 1 } }, "invalid-params"],
        ["invalid gain", { type: "amplify", params: { gainDb: 25 } }, "invalid-params"],
        ["invalid pitch", { type: "pitchShift", params: { semitones: 25 } }, "invalid-params"],
        ["invalid frequency", { type: "filter", params: { filterType: "lowpass", frequency: 0 } }, "invalid-params"]
      ];
      for (const [label, changes, error] of invalidInputs) {
        it("rejects " + label, async function () {
          await expectError("effects.create", [{ ...input, ...changes }], error);
          assert.lengthOf(await EffectsCollection.find({}).fetchAsync(), 1);
        });
      }
    });

    describe("effects.update", function () {
      for (const caller of [userId, hostId]) {
        it("allows the creator or host to update settings: " + caller, async function () {
          const result = await callMethod("effects.update", [effectId, updates], caller);
          const effect = await EffectsCollection.findOneAsync(effectId);

          assert.equal(result, 1);
          assert.deepEqual(effect, {
            ...original, ...updates, updatedAt: effect.updatedAt
          });
          assert.instanceOf(effect.updatedAt, Date);
          assert.isAbove(effect.updatedAt.getTime(), original.updatedAt.getTime());
        });
      }

      for (const caller of [null, "other-user", "other-host"]) {
        it("rejects an unauthorized caller: " + caller, async function () {
          await expectError("effects.update", [effectId, updates], "not-authorized", caller);
          assert.deepEqual(await EffectsCollection.findOneAsync(effectId), original);
        });
      }

      it("rejects a missing effect", async function () {
        await expectError("effects.update", ["missing", updates], "effect-not-found");
      });

      it("rejects missing audio without changing the effect", async function () {
        await AudioCollection.removeAsync(input.fileId);
        await expectError("effects.update", [effectId, updates], "audio-not-found");
        assert.deepEqual(await EffectsCollection.findOneAsync(effectId), original);
      });

      it("validates updates and preserves the effect when rejected", async function () {
        const cases = [
          [{ end: 0 }, "invalid-time"],
          [{ params: { targetPeakDb: 1 } }, "invalid-params"],
          [{ order: -1 }, "invalid-order"],
          [{ enabled: "false" }, /Match error/],
          [{ createdBy: hostId }, /Match error/]
        ];
        for (const [changes, error] of cases) {
          await expectError("effects.update", [effectId, { ...updates, ...changes }], error);
          assert.deepEqual(await EffectsCollection.findOneAsync(effectId), original);
        }
      });
    });

    describe("effects.delete", function () {
      for (const caller of [userId, hostId]) {
        it("allows the creator or host to delete an effect: " + caller, async function () {
          const otherId = await EffectsCollection.insertAsync({
            ...input, createdBy: userId
          });
          const result = await callMethod("effects.delete", [effectId], caller);

          assert.equal(result, 1);
          assert.isUndefined(await EffectsCollection.findOneAsync(effectId));
          assert.exists(await EffectsCollection.findOneAsync(otherId));
        });
      }

      for (const caller of [null, "other-user", "other-host"]) {
        it("rejects an unauthorized caller: " + caller, async function () {
          await expectError("effects.delete", [effectId], "not-authorized", caller);
          assert.deepEqual(await EffectsCollection.findOneAsync(effectId), original);
        });
      }

      it("does nothing when the effect does not exist", async function () {
        const result = await callMethod("effects.delete", ["missing"]);

        assert.isUndefined(result);
        assert.deepEqual(await EffectsCollection.findOneAsync(effectId), original);
      });

      it("rejects a non-string effectId", async function () {
        await expectError("effects.delete", [12345], /Match error/);
        assert.deepEqual(await EffectsCollection.findOneAsync(effectId), original);
      });
    });
  });
}