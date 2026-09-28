export const formatMs = (ms, { millis = false } = {}) => {
	const total = millis ? Math.round(ms) : Math.floor(ms);
	const minutes = Math.floor(total / 60000);
	const seconds = Math.floor((total % 60000) / 1000);
	const base = `${minutes}:${String(seconds).padStart(2, "0")}`;
	return millis ? `${base}.${String(total % 1000).padStart(3, "0")}` : base;
};

export const formatTime = (sec, { millis = false } = {}) => {
	if (!isFinite(sec)) return "0:00";

	const total = millis ? Math.round(sec * 1000) : Math.floor(sec * 1000);
	const minutes = Math.floor(total / 60000);
	const seconds = Math.floor((total % 60000) / 1000);
	const base = `${minutes}:${String(seconds).padStart(2, "0")}`;

	return millis ? `${base}.${String(total % 1000).padStart(3, "0")}` : base;
};

export const msToSeconds = (ms) => (ms == null ? null : ms / 1000);
export const toText = (seconds) =>
	seconds == null ? "" : formatMs(seconds * 1000, { millis: true });

// "83", "83.5", "1:23", "1:23.456", "1:02:03.5" -> milliseconds, or null
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
