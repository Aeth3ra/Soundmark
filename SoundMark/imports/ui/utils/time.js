/**
 * Formats a duration in milliseconds into a mm:ss or mm:ss.SSS string.
 *
 * @param {number} ms - Milliseconds to format.
 * @param {{ millis?: boolean }} [options] - Whether to include 3-digit millisecond fractions.
 * @returns {string} Formatted timestamp string.
 */
export const formatMs = (ms, { millis = false } = {}) => {
	const total = millis ? Math.round(ms) : Math.floor(ms);
	const minutes = Math.floor(total / 60000);
	const seconds = Math.floor((total % 60000) / 1000);
	const base = `${minutes}:${String(seconds).padStart(2, "0")}`;
	return millis ? `${base}.${String(total % 1000).padStart(3, "0")}` : base;
};

/**
 * Formats a duration in seconds into a mm:ss or mm:ss.SSS string.
 *
 * @param {number} sec - Seconds to format.
 * @param {{ millis?: boolean }} [options] - Whether to include 3-digit millisecond fractions.
 * @returns {string} Formatted timestamp string (returns "0:00" for non-finite values).
 */
export const formatTime = (sec, { millis = false } = {}) => {
	if (!isFinite(sec)) return "0:00";

	const total = millis ? Math.round(sec * 1000) : Math.floor(sec * 1000);
	const minutes = Math.floor(total / 60000);
	const seconds = Math.floor((total % 60000) / 1000);
	const base = `${minutes}:${String(seconds).padStart(2, "0")}`;

	return millis ? `${base}.${String(total % 1000).padStart(3, "0")}` : base;
};

/**
 * Converts milliseconds to seconds.
 *
 * @param {number|null} ms - Milliseconds value.
 * @returns {number|null} Equivalent seconds, or null if input was nullish.
 */
export const msToSeconds = (ms) => (ms == null ? null : ms / 1000);

/**
 * Converts seconds to a high-resolution mm:ss.SSS text timestamp.
 *
 * @param {number|null} seconds - Seconds value.
 * @returns {string} High-resolution timestamp string, or empty string if nullish.
 */
export const toText = (seconds) =>
	seconds == null ? "" : formatMs(seconds * 1000, { millis: true });

/**
 * Parses user-entered time strings into milliseconds.
 * Supports raw seconds ("83", "83.5"), minutes:seconds ("1:23", "1:23.456"),
 * and hours:minutes:seconds ("1:02:03.5").
 *
 * @param {string} input - User input string to parse.
 * @returns {number|null} Parsed milliseconds, or null if the input format is invalid.
 */
export const parseTimeToMs = (input) => {
	const s = input.trim();
	if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 1000);

	const match = s.match(/^(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)$/);
	if (!match) return null;

	const [, hours = 0, minutes, seconds] = match;
	return Math.round(
		((+hours * 60 + +minutes) * 60 + parseFloat(seconds)) * 1000
	);
};
