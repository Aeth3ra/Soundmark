import { Meteor } from "meteor/meteor";
import { renderHook, act } from "@testing-library/react";
import { assert } from "chai";
import sinon from "sinon";
import {
	parseCombo,
	comboMatchesEvent,
	isTypingTarget,
	useKeyboardShortcut
} from "./useKeyboardShortcut";

if (Meteor.isClient) {
	describe("useKeyboardShortcut Utils", function () {
		describe("parseCombo", function () {
			it("correctly parses a single key", function () {
				const result = parseCombo("a");
				assert.deepEqual(result, {
					key: "a",
					mod: false,
					ctrl: false,
					shift: false,
					alt: false
				});
			});

			it("correctly parses standard modifiers", function () {
				const result = parseCombo("mod+shift+x");
				assert.deepEqual(result, {
					key: "x",
					mod: true,
					ctrl: false,
					shift: true,
					alt: false
				});
			});

			it("handles uppercase and spacing safely", function () {
				const result = parseCombo(" CTRL + Alt + Delete ");
				assert.deepEqual(result, {
					key: "delete",
					mod: false,
					ctrl: true,
					shift: false,
					alt: true
				});
			});
		});

		describe("comboMatchesEvent", function () {
			it("matches exactly when correct modifiers and key are pressed", function () {
				const combo = parseCombo("mod+shift+z");
				const fakeEvent = {
					key: "z",
					metaKey: true, // "mod" allows metaKey or ctrlKey
					ctrlKey: false,
					shiftKey: true,
					altKey: false
				};
				assert.isTrue(comboMatchesEvent(combo, fakeEvent));
			});

			it("fails if an extra modifier is pressed (exact matching)", function () {
				const combo = parseCombo("mod+z");
				const fakeEvent = {
					key: "z",
					metaKey: true,
					ctrlKey: false,
					shiftKey: true, // Extra modifier!
					altKey: false
				};
				assert.isFalse(comboMatchesEvent(combo, fakeEvent));
			});

			it("distinguishes between explicit 'ctrl' and 'mod'", function () {
				const combo = parseCombo("ctrl+c");
				const fakeEventMac = {
					key: "c",
					metaKey: true, // Mac command
					ctrlKey: false,
					shiftKey: false,
					altKey: false
				};
				assert.isFalse(comboMatchesEvent(combo, fakeEventMac)); // Fails because explicit ctrl was requested
			});
		});

		describe("isTypingTarget", function () {
			it("returns true for editable elements", function () {
				assert.isTrue(isTypingTarget({ tagName: "INPUT" }));
				assert.isTrue(isTypingTarget({ tagName: "TEXTAREA" }));
				assert.isTrue(isTypingTarget({ tagName: "SELECT" }));
				assert.isTrue(
					isTypingTarget({ tagName: "DIV", isContentEditable: true })
				);
			});

			it("returns false for non-editable elements", function () {
				assert.isFalse(isTypingTarget({ tagName: "DIV" }));
				assert.isFalse(isTypingTarget({ tagName: "BUTTON" }));
				assert.isFalse(isTypingTarget(null));
			});
		});
	});

	describe("useKeyboardShortcut Hook", function () {
		let addEventListenerSpy;
		let removeEventListenerSpy;

		beforeEach(function () {
			addEventListenerSpy = sinon.spy(window, "addEventListener");
			removeEventListenerSpy = sinon.spy(window, "removeEventListener");
		});

		afterEach(function () {
			addEventListenerSpy.restore();
			removeEventListenerSpy.restore();
		});

		it("fires the handler when the shortcut is pressed", function () {
			const handlerSpy = sinon.spy();
			renderHook(() => useKeyboardShortcut("mod+s", handlerSpy));

			const event = new KeyboardEvent("keydown", {
				key: "s",
				metaKey: true
			});
			// Stub preventDefault to track it
			event.preventDefault = sinon.spy();

			act(() => {
				window.dispatchEvent(event);
			});

			assert.isTrue(handlerSpy.calledOnce);
			assert.isTrue(event.preventDefault.calledOnce);
		});

		it("does not fire when disabled", function () {
			const handlerSpy = sinon.spy();
			renderHook(() =>
				useKeyboardShortcut("mod+s", handlerSpy, { enabled: false })
			);

			act(() => {
				window.dispatchEvent(
					new KeyboardEvent("keydown", { key: "s", metaKey: true })
				);
			});

			assert.isFalse(handlerSpy.called);
			assert.isFalse(addEventListenerSpy.calledWith("keydown"));
		});

		it("does not fire if the user is typing in an editable field", function () {
			const handlerSpy = sinon.spy();
			renderHook(() => useKeyboardShortcut("a", handlerSpy));

			const input = document.createElement("input");
			document.body.appendChild(input);

			const event = new KeyboardEvent("keydown", {
				key: "a",
				bubbles: true
			});
			act(() => {
				input.dispatchEvent(event);
			});

			assert.isFalse(handlerSpy.called);
			document.body.removeChild(input);
		});

		it("cleans up listeners on unmount", function () {
			const { unmount } = renderHook(() =>
				useKeyboardShortcut("escape", () => {})
			);

			assert.isTrue(addEventListenerSpy.calledOnce);
			unmount();
			assert.isTrue(removeEventListenerSpy.calledOnce);
		});
	});
}
