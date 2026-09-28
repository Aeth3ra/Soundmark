import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import { useRegionContextMenu } from "./useRegionContextMenu";

if (Meteor.isClient) {
	describe("useRegionContextMenu", function () {
		// Helper to create a mock region with event listener tracking
		const createFakeRegion = (id = "test-region") => {
			const listeners = {};
			return {
				id,
				element: {
					addEventListener: sinon.spy((event, cb) => {
						listeners[event] = cb;
					}),
					removeEventListener: sinon.spy((event, cb) => {
						if (listeners[event] === cb) {
							delete listeners[event];
						}
					})
				},
				// Helper to simulate a right-click on this region's element
				_triggerContextMenu: function (eventArgs) {
					if (listeners["contextmenu"]) {
						listeners["contextmenu"](eventArgs);
					}
				}
			};
		};

		// Helper to create a mock Wavesurfer Regions plugin
		const createFakePlugin = (initialRegions = []) => {
			const eventHandlers = {};
			const unsubscribeSpies = {
				"region-created": sinon.spy(),
				"region-removed": sinon.spy()
			};

			return {
				getRegions: sinon.stub().returns(initialRegions),
				on: sinon.spy((eventName, cb) => {
					eventHandlers[eventName] = cb;
					return unsubscribeSpies[eventName];
				}),
				// Helper to simulate plugin events (e.g., 'region-created')
				_triggerEvent: function (eventName, arg) {
					if (eventHandlers[eventName]) {
						eventHandlers[eventName](arg);
					}
				},
				_unsubscribeSpies: unsubscribeSpies
			};
		};

		it("returns default empty state when regionsPlugin is null", function () {
			const { result } = renderHook(() => useRegionContextMenu(null));

			assert.isNull(result.current.menuState);
			assert.isFunction(result.current.close);
		});

		it("attaches listeners to existing regions on mount and sets menu state on right-click", function () {
			const fakeRegion = createFakeRegion();
			const fakePlugin = createFakePlugin([fakeRegion]);

			const { result } = renderHook(() =>
				useRegionContextMenu(fakePlugin)
			);

			// Verify listener was attached
			assert.isTrue(
				fakeRegion.element.addEventListener.calledWith("contextmenu")
			);

			const fakeEvent = {
				preventDefault: sinon.spy(),
				clientX: 150,
				clientY: 250
			};

			// Trigger the right click
			act(() => {
				fakeRegion._triggerContextMenu(fakeEvent);
			});

			assert.isTrue(fakeEvent.preventDefault.calledOnce);
			assert.deepEqual(result.current.menuState, {
				x: 150,
				y: 250,
				region: fakeRegion
			});
		});

		it("attaches to newly created regions dynamically", function () {
			const fakePlugin = createFakePlugin([]);
			const { result } = renderHook(() =>
				useRegionContextMenu(fakePlugin)
			);

			const newRegion = createFakeRegion("new-region");

			// Simulate a new region being created
			act(() => {
				fakePlugin._triggerEvent("region-created", newRegion);
			});

			assert.isTrue(
				newRegion.element.addEventListener.calledWith("contextmenu")
			);

			const fakeEvent = {
				preventDefault: sinon.spy(),
				clientX: 10,
				clientY: 20
			};

			act(() => {
				newRegion._triggerContextMenu(fakeEvent);
			});

			assert.deepEqual(result.current.menuState, {
				x: 10,
				y: 20,
				region: newRegion
			});
		});

		it("cleans up listeners when a region is removed or the component unmounts", function () {
			const fakeRegion = createFakeRegion();
			const fakePlugin = createFakePlugin([fakeRegion]);

			const { unmount } = renderHook(() =>
				useRegionContextMenu(fakePlugin)
			);

			// Simulate the region being removed from wavesurfer
			act(() => {
				fakePlugin._triggerEvent("region-removed", fakeRegion);
			});

			// It should detach from that specific region
			assert.isTrue(
				fakeRegion.element.removeEventListener.calledWith("contextmenu")
			);

			// Unmounting should trigger the unsubscribe methods from `on()`
			unmount();
			assert.isTrue(
				fakePlugin._unsubscribeSpies["region-created"].calledOnce
			);
			assert.isTrue(
				fakePlugin._unsubscribeSpies["region-removed"].calledOnce
			);
		});

		it("clears the menu state when close() is called", function () {
			const fakeRegion = createFakeRegion();
			const fakePlugin = createFakePlugin([fakeRegion]);

			const { result } = renderHook(() =>
				useRegionContextMenu(fakePlugin)
			);

			act(() => {
				fakeRegion._triggerContextMenu({
					preventDefault: sinon.spy(),
					clientX: 50,
					clientY: 50
				});
			});

			assert.isNotNull(result.current.menuState);

			act(() => {
				result.current.close();
			});

			assert.isNull(result.current.menuState);
		});
	});
}
