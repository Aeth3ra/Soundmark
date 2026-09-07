import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import sinon from "sinon";
import {
  sliceAudioBuffer,
  applyEffectsChain,
  encodeWavBlob,
  secondsToFileLabel
} from "./audioExport";

if (Meteor.isClient) {
  describe("audioExport", function () {
    const createBuffer = (samplesPerChannel, sampleRate = 8000, channels = 1) => {
      const buffer = new AudioBuffer({
        numberOfChannels: channels,
        length: samplesPerChannel,
        sampleRate
      });
      for (let ch = 0; ch < channels; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          data[i] = ((i % 10) / 10) * 2 - 1; // ramp between -1 and ~1
        }
      }
      return buffer;
    };

    describe("sliceAudioBuffer", function () {
      it("returns only the samples within the requested region", function () {
        const source = createBuffer(1000, 1000); // 1 second, 1 sample/ms
        const sliced = sliceAudioBuffer(source, 0.2, 0.5);

        assert.equal(sliced.length, 300);
        assert.equal(sliced.sampleRate, 1000);
        assert.deepEqual(
          Array.from(sliced.getChannelData(0)),
          Array.from(source.getChannelData(0).subarray(200, 500))
        );
      });

      it("clamps out-of-range regions to the buffer's bounds", function () {
        const source = createBuffer(1000, 1000);
        const sliced = sliceAudioBuffer(source, -5, 50);

        assert.equal(sliced.length, 1000);
      });

      it("throws when the region is empty", function () {
        const source = createBuffer(1000, 1000);
        assert.throws(() => sliceAudioBuffer(source, 0.5, 0.5));
      });

      it("preserves every channel independently", function () {
        const source = createBuffer(100, 100, 2);
        source.getChannelData(1).fill(0.42);

        const sliced = sliceAudioBuffer(source, 0, 1);

        assert.equal(sliced.numberOfChannels, 2);
        assert.equal(sliced.getChannelData(1)[10], 0.42);
      });
    });

    describe("applyEffectsChain", function () {
      it("returns the buffer unchanged when no effects are given", function () {
        const buffer = createBuffer(10);
        assert.strictEqual(applyEffectsChain(buffer), buffer);
        assert.strictEqual(applyEffectsChain(buffer, []), buffer);
      });

      it("warns but still passes the buffer through if effects are supplied", function () {
        const warnStub = sinon.stub(console, "warn");
        const buffer = createBuffer(10);

        try {
          const result = applyEffectsChain(buffer, [{ type: "gain" }]);
          assert.strictEqual(result, buffer);
          assert.isTrue(warnStub.calledOnce);
        } finally {
          warnStub.restore();
        }
      });
    });

    describe("encodeWavBlob", function () {
      it("produces a WAV blob with a correctly sized header and data chunk", async function () {
        const buffer = createBuffer(100, 8000, 1);
        const blob = encodeWavBlob(buffer);

        assert.equal(blob.type, "audio/wav");
        // 44-byte header + 100 frames * 1 channel * 2 bytes/sample
        assert.equal(blob.size, 44 + 200);

        const view = new DataView(await blob.arrayBuffer());
        const readString = (offset, length) =>
          String.fromCharCode(
            ...Array.from({ length }, (_, i) => view.getUint8(offset + i))
          );

        assert.equal(readString(0, 4), "RIFF");
        assert.equal(readString(8, 4), "WAVE");
        assert.equal(view.getUint16(22, true), 1); // numChannels
        assert.equal(view.getUint32(24, true), 8000); // sampleRate
      });
    });

    describe("secondsToFileLabel", function () {
      it("formats sub-minute durations without a minutes component", function () {
        assert.equal(secondsToFileLabel(12), "12s");
        assert.equal(secondsToFileLabel(0), "0s");
      });

      it("formats durations over a minute as MmSSs", function () {
        assert.equal(secondsToFileLabel(65), "1m05s");
        assert.equal(secondsToFileLabel(125), "2m05s");
      });
    });
  });
}
