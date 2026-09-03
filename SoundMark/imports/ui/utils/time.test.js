import { assert } from "chai";
import { formatMs, formatTime } from "./time"; // adjust path as needed
if (Meteor.isClient) {
  describe("timeUtils", function () {
    describe("formatMs", function () {
      it("formats 0 ms correctly", function () {
        assert.equal(formatMs(0), "0:00");
      });

      it("truncates sub-second milliseconds", function () {
        assert.equal(formatMs(750), "0:00");
      });

      it("pads single-digit seconds with a leading zero", function () {
        assert.equal(formatMs(5000), "0:05");
      });

      it("formats multi-digit seconds correctly", function () {
        assert.equal(formatMs(45000), "0:45");
      });

      it("formats minutes and padded seconds correctly", function () {
        assert.equal(formatMs(65000), "1:05");
        assert.equal(formatMs(600000), "10:00");
      });
    });

    describe("formatTime", function () {
      it("formats 0 seconds correctly", function () {
        assert.equal(formatTime(0), "0:00");
      });

      it("pads single-digit seconds with a leading zero", function () {
        assert.equal(formatTime(5), "0:05");
      });

      it("formats minutes and padded seconds correctly", function () {
        assert.equal(formatTime(65), "1:05");
        assert.equal(formatTime(3599), "59:59");
      });

      it("floors decimal/fractional seconds", function () {
        assert.equal(formatTime(65.89), "1:05");
      });

      it("returns '0:00' for non-finite values (NaN, Infinity, undefined)", function () {
        assert.equal(formatTime(NaN), "0:00");
        assert.equal(formatTime(Infinity), "0:00");
        assert.equal(formatTime(-Infinity), "0:00");
        assert.equal(formatTime(undefined), "0:00");
      });
    });
  });
}
