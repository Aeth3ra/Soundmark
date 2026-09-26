import { useEffect, useMemo, useRef } from "react";

const MODIFIER_TOKENS = new Set(["mod", "ctrl", "shift", "alt", "meta"]);

/**
 * "mod+a" -> { key: "a", mod: true, ctrl: false, shift: false, alt: false }
 *
 * "mod" is the conventional cross-platform modifier: Ctrl on
 * Windows/Linux, Cmd on macOS. Use "ctrl" instead if you specifically
 * need the physical Control key on every platform.
 */
export const parseCombo = (combo) => {
	const tokens = combo
		.toLowerCase()
		.split("+")
		.map((token) => token.trim());

	return {
		key: tokens.find((token) => !MODIFIER_TOKENS.has(token)),
		mod: tokens.includes("mod"),
		ctrl: tokens.includes("ctrl"),
		shift: tokens.includes("shift"),
		alt: tokens.includes("alt")
	};
};

// Exact modifier matching, so "mod+a" does NOT fire on "mod+shift+a".
export const comboMatchesEvent = (combo, event) => {
	const modPressed = event.ctrlKey || event.metaKey;

	return (
		event.key.toLowerCase() === combo.key &&
		modPressed === combo.mod &&
		event.ctrlKey === (combo.ctrl || combo.mod ? event.ctrlKey : false) &&
		event.shiftKey === combo.shift &&
		event.altKey === combo.alt
	);
};

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

// Shortcuts should never hijack typing into a text field, a search box,
// an annotation/effect form, etc.
export const isTypingTarget = (target) =>
	Boolean(target) &&
	(EDITABLE_TAGS.has(target.tagName) || target.isContentEditable);

/**
 * Fires `handler` when `combo` (e.g. "mod+a") is pressed.
 *
 * - `enabled` lets the caller express *when* a shortcut is valid (e.g.
 *   "only when a region is selected") without touching the matching logic.
 * - The handler is kept in a ref so the listener doesn't need to be torn
 *   down and re-attached every time an inline callback is re-created.
 */
export const useKeyboardShortcut = (
	combo,
	handler,
	{ enabled = true } = {}
) => {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	const parsedCombo = useMemo(() => parseCombo(combo), [combo]);

	useEffect(() => {
		if (!enabled) return undefined;

		const onKeyDown = (event) => {
			if (isTypingTarget(event.target)) return;
			if (!comboMatchesEvent(parsedCombo, event)) return;

			event.preventDefault();
			handlerRef.current(event);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [parsedCombo, enabled]);
};
