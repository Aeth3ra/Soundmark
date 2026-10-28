/**
 * Single source of truth for every effect type.
 *
 * Adding or changing an effect (a new param, a new range, a new field) means
 * editing this object only -- EffectForm, EffectField and EffectCard stay
 * generic and don't need to know about specific effect types.
 *
 * Per-type config:
 *  - label:         name shown in the type picker and as the card's default title
 *  - defaultParams: initial params for the form
 *  - fields:        drives the form inputs AND validation (form + stored effects)
 *  - summarize:     one-line description of a valid params object (used by the card)
 *  - getTitle:      optional; overrides `label` as the card title for a given params
 */

const formatSigned = (value) => (value > 0 ? `+${value}` : String(value));

export const EFFECT_TYPES = {
	normalize: {
		label: "Peak normalisation",
		// Sets the loudest sample in the region to this level. The backend
		// derives gain from the region's measured peak, so a target <= 0 dB
		// can never clip.
		defaultParams: { targetPeakDb: -1 },
		fields: [
			{
				name: "targetPeakDb",
				label: "Target peak (dB)",
				kind: "number",
				min: -6,
				max: 0,
				step: "any",
				help: "Sets the loudest point of the region to this level. -1 dB is a safe default.",
				errorLabel: "a target peak between -6 dB and 0 dB"
			}
		],
		summarize: (params) => `Target peak: ${params.targetPeakDb} dB`
	},

	amplify: {
		label: "Region amplification",
		defaultParams: { gainDb: 0 },
		fields: [
			{
				name: "gainDb",
				label: "Gain (dB)",
				kind: "range",
				min: -24,
				max: 24,
				step: "any",
				help: "0 dB leaves the level unchanged; positive values boost, negative values cut. Peaks that would clip are limited instead of blocked.",
				errorLabel: "a gain between -24 dB and +24 dB"
			}
		],
		summarize: (params) => `Gain: ${formatSigned(params.gainDb)} dB`
	},

	pitchShift: {
		label: "Pitch / key shift",
		defaultParams: { semitones: 0 },
		fields: [
			{
				name: "semitones",
				label: "Pitch / key shift",
				kind: "range",
				min: -24,
				max: 24,
				step: 1,
				integer: true,
				help: "Negative values lower the pitch/key; positive values raise it. 12 semitones equals one octave.",
				errorLabel: "a pitch/key shift between -24 and +24 semitones"
			}
		],
		summarize: (params) => `${formatSigned(params.semitones)} semitones`
	},

	filter: {
		label: "Low / high-pass filter",
		defaultParams: { filterType: "lowpass", frequency: 1000 },
		fields: [
			{
				name: "filterType",
				label: "Filter type",
				kind: "select",
				options: [
					{ value: "lowpass", label: "Low-pass" },
					{ value: "highpass", label: "High-pass" }
				]
			},
			{
				name: "frequency",
				label: "Cutoff frequency (Hz)",
				kind: "number",
				min: 1,
				max: 24000,
				step: 1,
				help: "Low-pass keeps frequencies below the cutoff; high-pass keeps frequencies above it.",
				errorLabel: "a filter frequency between 1 and 24000 Hz"
			}
		],
		getTitle: (params) =>
			params.filterType === "highpass"
				? "High-pass filter"
				: "Low-pass filter",
		summarize: (params) => `Cutoff: ${params.frequency} Hz`
	}
};

/**
 * Checks one value against one field's rules. Accepts raw form strings or
 * stored values. Returns `{ value }` on success (coerced to its final type)
 * or `{ error }` with a user-facing message.
 */
function parseFieldValue(field, raw) {
	if (field.kind === "select") {
		const isKnownOption = field.options.some(
			(option) => option.value === raw
		);
		return isKnownOption
			? { value: raw }
			: { error: `Choose a valid ${field.label.toLowerCase()}.` };
	}

	const isEmpty = typeof raw === "string" && raw.trim() === "";
	const value = Number(raw);
	const outOfRange =
		!Number.isFinite(value) || value < field.min || value > field.max;
	const notInteger = field.integer && !Number.isInteger(value);

	return isEmpty || outOfRange || notInteger
		? { error: `Enter ${field.errorLabel}.` }
		: { value };
}

/**
 * Validates and coerces form input strings into the structured parameter object expected by the backend.
 *
 * @param {string} type - Effect type key.
 * @param {Record<string, string>} rawValues - Map of raw form values.
 * @returns {Record<string, any>} Validated and type-coerced parameter map.
 * @throws {Error} User-facing validation error if a field value is out of range.
 */
export function validateEffectParams(type, rawValues) {
	const config = EFFECT_TYPES[type];
	if (!config) {
		throw new Error("Choose a supported effect type.");
	}

	const params = {};

	for (const field of config.fields) {
		const { value, error } = parseFieldValue(field, rawValues[field.name]);
		if (error) {
			throw new Error(error);
		}
		params[field.name] = value;
	}

	return params;
}

/**
 * Validates already-stored parameter values against field constraints without throwing.
 *
 * @param {string} type - Effect type key.
 * @param {object} params - Stored parameters map.
 * @returns {boolean} True if all parameters conform to current validation rules.
 */
export function isEffectParamsValid(type, params) {
	const config = EFFECT_TYPES[type];
	if (!config || params === null || typeof params !== "object") {
		return false;
	}

	return config.fields.every((field) => {
		const raw = params[field.name];
		if (field.kind !== "select" && typeof raw !== "number") {
			return false;
		}
		return !parseFieldValue(field, raw).error;
	});
}

/**
 * Generates card display metadata for a stored effect, flagging if parameters require migration.
 *
 * @param {string} type - Effect type key.
 * @param {object} params - Stored parameters map.
 * @returns {{ title: string, details: string, needsRecreation: boolean }}
 */
export function describeEffect(type, params) {
	const config = EFFECT_TYPES[type];

	if (!config) {
		return {
			title: "Unknown effect",
			details: String(type),
			needsRecreation: false
		};
	}

	if (!isEffectParamsValid(type, params)) {
		return {
			title: `${config.label}: recreate effect`,
			details:
				"These settings are invalid or out of date. Delete this effect and recreate it.",
			needsRecreation: true
		};
	}

	return {
		title: config.getTitle ? config.getTitle(params) : config.label,
		details: config.summarize(params),
		needsRecreation: false
	};
}

/**
 * Converts a type's default parameters into string values for controlled form inputs.
 *
 * @param {string} type - Effect type key.
 * @returns {Record<string, string>} Form field defaults as strings.
 */
export function defaultFieldValues(type) {
	const { defaultParams } = EFFECT_TYPES[type];
	return Object.fromEntries(
		Object.entries(defaultParams).map(([key, value]) => [
			key,
			String(value)
		])
	);
}

/**
 * Maps raw parameter keys to human-readable labels.
 */
const PARAM_LABELS = {
	targetPeakDb: "Target Peak",
	gainDb: "Gain",
	semitones: "Pitch Shift",
	filterType: "Type",
	frequency: "Frequency"
};

/**
 * Formats a parameter value with units (e.g. dB, Hz, semitones).
 *
 * @param {string} key - Parameter field name.
 * @param {any} value - Parameter value.
 * @returns {string} Formatted label string.
 */
export const formatParamValue = (key, value) => {
	if (value == null) return "N/A";

	switch (key) {
		case "targetPeakDb":
			return `${value} dB`;
		case "gainDb":
			return `${value > 0 ? "+" : ""}${value} dB`;
		case "semitones":
			return `${value > 0 ? "+" : ""}${value} semitones`;
		case "filterType":
			if (value === "lowpass") return "Low-pass";
			if (value === "highpass") return "High-pass";
			return String(value);
		case "frequency":
			return `${value} Hz`;
		default:
			return String(value);
	}
};

/**
 * Maps a parameter field name to its display label.
 *
 * @param {string} key - Parameter field name.
 * @returns {string} Human-readable label.
 */
export const formatParamLabel = (key) => {
	return PARAM_LABELS[key] || key;
};
