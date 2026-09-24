import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useWaveformWidth } from "./useWaveformWidth";

if (Meteor.isClient) {
	describe("useWaveformWidth", function () {
		let mockWrapper;
		let mockWavesurfer;
		let eventListeners;

		beforeEach(function () {
			eventListeners = {};

			mockWrapper = {
				scrollWidth: 800
			};

			mockWavesurfer = {
				getWrapper: sinon.stub().returns(mockWrapper),
				on: sinon.spy((event, callback) => {
					eventListeners[event] = callback;
				}),
				un: sinon.spy((event) => {
					delete eventListeners[event];
				})
			};
		});

		afterEach(function () {
			sinon.restore();
		});

		it("returns 0 if wavesurferInstance is null or undefined", function () {
			const { result } = renderHook(() => useWaveformWidth(null));

			assert.equal(result.current, 0);
		});

		it("returns 0 if getWrapper() returns null or undefined", function () {
			mockWavesurfer.getWrapper.returns(null);

			const { result } = renderHook(() =>
				useWaveformWidth(mockWavesurfer)
			);

			assert.equal(result.current, 0);
		});

		it("initializes with the current scrollWidth of the wrapper", function () {
			const { result } = renderHook(() =>
				useWaveformWidth(mockWavesurfer)
			);

			assert.equal(result.current, 800);
			assert.isTrue(mockWavesurfer.getWrapper.called);
		});

		it("subscribes to 'zoom' and 'redraw' events on mount", function () {
			renderHook(() => useWaveformWidth(mockWavesurfer));

			assert.isTrue(
				mockWavesurfer.on.calledWith("zoom", sinon.match.func)
			);
			assert.isTrue(
				mockWavesurfer.on.calledWith("redraw", sinon.match.func)
			);
		});

		it("unsubscribes from 'zoom' and 'redraw' events on unmount", function () {
			const { unmount } = renderHook(() =>
				useWaveformWidth(mockWavesurfer)
			);

			unmount();

			assert.isTrue(
				mockWavesurfer.un.calledWith("zoom", sinon.match.func)
			);
			assert.isTrue(
				mockWavesurfer.un.calledWith("redraw", sinon.match.func)
			);
		});

		it("updates waveformWidth when 'zoom' event is triggered", function () {
			const { result } = renderHook(() =>
				useWaveformWidth(mockWavesurfer)
			);

			assert.equal(result.current, 800);

			// Simulate a zoom event updating the scrollWidth
			mockWrapper.scrollWidth = 1200;

			act(() => {
				if (eventListeners["zoom"]) {
					eventListeners["zoom"]();
				}
			});

			assert.equal(result.current, 1200);
		});

		it("updates waveformWidth when 'redraw' event is triggered", function () {
			const { result } = renderHook(() =>
				useWaveformWidth(mockWavesurfer)
			);

			assert.equal(result.current, 800);

			// Simulate a redraw event updating the scrollWidth
			mockWrapper.scrollWidth = 600;

			act(() => {
				if (eventListeners["redraw"]) {
					eventListeners["redraw"]();
				}
			});

			assert.equal(result.current, 600);
		});

		it("cleans up listeners when wavesurferInstance changes", function () {
			const { rerender } = renderHook(
				({ instance }) => useWaveformWidth(instance),
				{ initialProps: { instance: mockWavesurfer } }
			);

			const newMockWrapper = { scrollWidth: 1500 };
			const newMockWavesurfer = {
				getWrapper: sinon.stub().returns(newMockWrapper),
				on: sinon.spy(),
				un: sinon.spy()
			};

			rerender({ instance: newMockWavesurfer });

			// Old instance should have un-registered its listeners
			assert.isTrue(
				mockWavesurfer.un.calledWith("zoom", sinon.match.func)
			);
			assert.isTrue(
				mockWavesurfer.un.calledWith("redraw", sinon.match.func)
			);

			// New instance should have registered its listeners
			assert.isTrue(
				newMockWavesurfer.on.calledWith("zoom", sinon.match.func)
			);
			assert.isTrue(
				newMockWavesurfer.on.calledWith("redraw", sinon.match.func)
			);
		});
	});
}
