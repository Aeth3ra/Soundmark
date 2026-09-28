import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useEffectsRender } from "./useEffectLane";

if (Meteor.isClient) {
	describe("useEffectsRender", function () {
		const ROW_HEIGHT = 18;

		// Shared mock test data
		const effectA = { _id: "1", start: 0, end: 5, enabled: true, order: 0 };
		const effectB = {
			_id: "2",
			start: 5,
			end: 10,
			enabled: true,
			order: 1
		};
		const effectC = { _id: "3", start: 2, end: 7, enabled: true, order: 2 };
		const effectD = {
			_id: "4",
			start: 1,
			end: 3,
			enabled: false,
			order: 3
		};

		afterEach(function () {
			sinon.restore();
		});

		describe("Edge Cases & Guard Clauses", function () {
			it("handles empty or null/undefined effects gracefully", function () {
				const { result } = renderHook(() =>
					useEffectsRender(1000, null, 10, 0)
				);

				assert.deepEqual(result.current.bandSlots, []);
				assert.equal(result.current.laneHeight, ROW_HEIGHT);
			});

			it("returns empty bandSlots when waveformWidth is 0", function () {
				const { result } = renderHook(() =>
					useEffectsRender(0, [effectA], 10, 2)
				);

				assert.deepEqual(result.current.bandSlots, []);
				assert.equal(result.current.laneHeight, ROW_HEIGHT);
			});

			it("returns empty bandSlots when duration is 0 or negative", function () {
				const { result } = renderHook(() =>
					useEffectsRender(1000, [effectA], 0, 2)
				);

				assert.deepEqual(result.current.bandSlots, []);
				assert.equal(result.current.laneHeight, ROW_HEIGHT);
			});
		});

		describe("Coordinate & Metric Calculations", function () {
			it("correctly calculates left, width, top, and laneHeight", function () {
				// duration = 10s, width = 1000px => 100px per second
				const { result } = renderHook(() =>
					useEffectsRender(1000, [effectA], 10, 2)
				);

				assert.equal(result.current.laneHeight, ROW_HEIGHT);
				assert.lengthOf(result.current.bandSlots, 1);

				const slot = result.current.bandSlots[0];
				assert.equal(slot.left, 0); // 0s * 100px/s
				assert.equal(slot.width, 500); // (5s - 0s) * 100px/s
				assert.equal(slot.top, 0); // Row 0 * 18
				assert.equal(slot.id, "1");
			});

			it("enforces minimum width of 2px for zero-duration effects", function () {
				const instantEffect = {
					_id: "tiny",
					start: 1,
					end: 1,
					enabled: true,
					order: 0
				};
				const { result } = renderHook(() =>
					useEffectsRender(1000, [instantEffect], 10, 0)
				);

				assert.equal(result.current.bandSlots[0].width, 2);
			});
		});

		describe("Greedy Interval Packing (Row Assignment)", function () {
			it("places non-overlapping contiguous effects in the same row (row 0)", function () {
				// effectA ends at 5, effectB starts at 5 (5 <= 5 allows row reuse)
				const { result } = renderHook(() =>
					useEffectsRender(1000, [effectA, effectB], 10, 0)
				);

				assert.equal(result.current.laneHeight, ROW_HEIGHT);
				assert.equal(result.current.bandSlots[0].top, 0);
				assert.equal(result.current.bandSlots[1].top, 0);
			});

			it("places overlapping effects into separate rows", function () {
				// A: [0, 5], C: [2, 7] -> overlaps!
				const { result } = renderHook(() =>
					useEffectsRender(1000, [effectA, effectC], 10, 0)
				);

				assert.equal(result.current.laneHeight, ROW_HEIGHT * 2);

				const slotA = result.current.bandSlots.find(
					(s) => s.id === "1"
				);
				const slotC = result.current.bandSlots.find(
					(s) => s.id === "3"
				);

				assert.isDefined(slotA);
				assert.isDefined(slotC);
				assert.equal(slotA.top, 0);
				assert.equal(slotC.top, ROW_HEIGHT);
			});

			it("sorts by start time first, then order, before packing", function () {
				const unsorted = [effectB, effectA];
				const { result } = renderHook(() =>
					useEffectsRender(1000, unsorted, 10, 0)
				);

				assert.equal(result.current.bandSlots[0].id, "1");
				assert.equal(result.current.bandSlots[1].id, "2");
			});
		});

		describe("isActive Flag Determination", function () {
			it("marks slot as active when currentTime is within [start, end] and effect is enabled", function () {
				const { result } = renderHook(() =>
					useEffectsRender(1000, [effectA], 10, 2.5)
				);

				assert.isTrue(result.current.bandSlots[0].isActive);
			});

			it("marks slot as inactive when currentTime is outside range", function () {
				const { result } = renderHook(() =>
					useEffectsRender(1000, [effectA], 10, 6)
				);

				assert.isFalse(result.current.bandSlots[0].isActive);
			});

			it("marks slot as inactive if effect is disabled", function () {
				const { result } = renderHook(() =>
					useEffectsRender(1000, [effectD], 10, 2)
				);

				assert.isFalse(result.current.bandSlots[0].isActive);
			});
		});

		describe("Reactivity and Updates", function () {
			it("updates isActive state when currentTime changes", async function () {
				const { result, rerender } = renderHook(
					({ time }) => useEffectsRender(1000, [effectA], 10, time),
					{ initialProps: { time: 1 } }
				);

				assert.isTrue(result.current.bandSlots[0].isActive);

				act(() => {
					rerender({ time: 6 });
				});

				assert.isFalse(result.current.bandSlots[0].isActive);
			});
		});
	});
}
