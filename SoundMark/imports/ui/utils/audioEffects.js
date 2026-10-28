import { measureAudioBuffer } from "./audioAnalysis";
import { Offline, ToneBufferSource, PitchShift } from "tone";
import {
	sliceAudioBuffer,
	spliceAudioBuffer,
	cloneAudioBuffer
} from "./audioExport";

/**
 * Renders an AudioBuffer through a linear GainNode using OfflineAudioContext.
 *
 * @param {AudioBuffer} audioBuffer - Buffer to process.
 * @param {number} gain - Linear amplitude multiplier.
 * @returns {Promise<AudioBuffer>} Rendered audio buffer.
 */
async function renderGain(audioBuffer, gain) {
	const OfflineContext =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!OfflineContext) {
		throw new Error(
			"This browser does not support offline audio processing."
		);
	}

	const context = new OfflineContext(
		audioBuffer.numberOfChannels,
		audioBuffer.length,
		audioBuffer.sampleRate
	);
	const source = context.createBufferSource();
	const gainNode = context.createGain();
	source.buffer = audioBuffer;
	gainNode.channelCount = audioBuffer.numberOfChannels;
	gainNode.channelCountMode = "explicit";
	gainNode.channelInterpretation = "discrete";
	gainNode.gain.setValueAtTime(gain, 0);
	source.connect(gainNode);
	gainNode.connect(context.destination);
	source.start(0);

	try {
		return await context.startRendering();
	} finally {
		source.disconnect();
		gainNode.disconnect();
	}
}

/**
 * Pitch-shifts an AudioBuffer by the requested number of semitones using Tone.js.
 *
 * @param {AudioBuffer} audioBuffer - Source audio buffer (never mutated).
 * @param {number} semitones - Shift amount in semitones (between -24 and 24).
 * @returns {Promise<AudioBuffer>} Rendered pitch-shifted audio buffer.
 */
async function renderPitchShift(audioBuffer, semitones) {
	if (!Number.isFinite(semitones) || semitones < -24 || semitones > 24) {
		throw new Error("Pitch shift must be between -24 and 24 semitones.");
	}

	const rendered = await Offline(
		() => {
			const source = new ToneBufferSource(audioBuffer);
			const pitchShift = new PitchShift({
				pitch: semitones,
				// Smaller windows reduce the response latency at the expense of
				// somewhat less smooth pitch shifting.
				windowSize: 0.05
			});

			source.connect(pitchShift);
			pitchShift.toDestination();
			source.start(0);
		},
		audioBuffer.duration,
		audioBuffer.numberOfChannels,
		audioBuffer.sampleRate
	);

	return rendered.get();
}

/**
 * Applies a biquad low-pass or high-pass filter to an AudioBuffer.
 *
 * @param {AudioBuffer} audioBuffer - Source audio buffer (never mutated).
 * @param {"lowpass"|"highpass"} filterType - Type of filter to apply.
 * @param {number} frequency - Cutoff frequency in Hz.
 * @returns {Promise<AudioBuffer>} Rendered filtered audio buffer.
 */
async function renderFilter(audioBuffer, filterType, frequency) {
	if (filterType !== "lowpass" && filterType !== "highpass") {
		throw new Error("Filter must be either low-pass or high-pass.");
	}

	if (!Number.isFinite(frequency) || frequency <= 0) {
		throw new Error("Filter frequency must be greater than 0 Hz.");
	}

	// The cutoff frequency must be below the Nyquist frequency for the
	// particular audio being processed.
	if (frequency >= audioBuffer.sampleRate / 2) {
		throw new Error(
			`Filter frequency must be below ${audioBuffer.sampleRate / 2} Hz for this audio.`
		);
	}

	const OfflineContext =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;

	if (!OfflineContext) {
		throw new Error(
			"This browser does not support offline audio processing."
		);
	}

	const context = new OfflineContext(
		audioBuffer.numberOfChannels,
		audioBuffer.length,
		audioBuffer.sampleRate
	);

	const source = context.createBufferSource();
	const filter = context.createBiquadFilter();

	source.buffer = audioBuffer;

	filter.type = filterType;
	filter.frequency.setValueAtTime(frequency, 0);

	filter.channelCount = audioBuffer.numberOfChannels;
	filter.channelCountMode = "explicit";
	filter.channelInterpretation = "discrete";

	source.connect(filter);
	filter.connect(context.destination);
	source.start(0);

	try {
		return await context.startRendering();
	} finally {
		source.disconnect();
		filter.disconnect();
	}
}

/**
 * Applies an ordered chain of active effects across regions of an audio track.
 * The source AudioBuffer is never mutated.
 *
 * @param {AudioBuffer} audioBuffer - Base audio track to process.
 * @param {Array<object>} [effects=[]] - List of effect documents to apply.
 * @returns {Promise<AudioBuffer>} Cloned and processed AudioBuffer.
 */
export async function applyEffectsChain(audioBuffer, effects = []) {
	validateEffectsList(effects);

	const activeEffects = getOrderedActiveEffects(effects);
	if (activeEffects.length === 0) return audioBuffer;

	const output = cloneAudioBuffer(audioBuffer);

	for (const effect of activeEffects) {
		const handler = EFFECT_HANDLERS[effect.type];
		if (!handler) {
			throw new Error(
				`Rendering ${effect.type} effects is not implemented yet.`
			);
		}

		const { start, end, params } = effect;

		validateRegionBounds(start, end, output.duration);
		handler.validateParams(params);

		const region = sliceAudioBuffer(output, start, end);
		const metrics = measureAudioBuffer(region);

		if (metrics.rms === 0) continue;

		const renderedRegion = await handler.render(region, params, metrics);
		spliceAudioBuffer(output, renderedRegion, start);
	}

	return output;
}

/**
 * Registry of supported effect handlers.
 * Each handler encapsulates its own parameter validation and rendering strategy.
 */
const EFFECT_HANDLERS = {
	normalize: {
		validateParams(params) {
			if (
				!params ||
				!Number.isFinite(params.targetPeakDb) ||
				params.targetPeakDb < -6 ||
				params.targetPeakDb > 0
			) {
				throw new Error(
					"Invalid normalisation settings. Choose a target peak " +
						"between -6 dB and 0 dB."
				);
			}
		},
		async render(region, params, { peak }) {
			if (!Number.isFinite(peak) || peak <= 0) {
				throw new Error(
					"This region is silent and cannot be normalised."
				);
			}

			const targetPeakLinear = dbToLinear(params.targetPeakDb);
			const gain = targetPeakLinear / peak;

			if (!Number.isFinite(Math.fround(gain))) {
				throw new Error(
					"This region is too quiet to normalise with a GainNode."
				);
			}

			return renderGain(region, gain);
		}
	},
	amplify: {
		validateParams(params) {
			if (
				!params ||
				!Number.isFinite(params.gainDb) ||
				params.gainDb < -24 ||
				params.gainDb > 24
			) {
				throw new Error(
					"Invalid amplification settings. Use a gain between " +
						"-24 dB and +24 dB."
				);
			}
		},
		async render(region, params) {
			const gain = dbToLinear(params.gainDb);

			if (!Number.isFinite(Math.fround(gain))) {
				throw new Error("Invalid amplification gain.");
			}

			const rendered = await renderGain(region, gain);
			hardLimitInPlace(rendered);
			return rendered;
		}
	},

	pitchShift: {
		validateParams(params) {
			if (
				!params ||
				!Number.isFinite(params.semitones) ||
				params.semitones < -24 ||
				params.semitones > 24
			) {
				throw new Error(
					"Invalid pitch shift. Use a value between -24 and 24 semitones."
				);
			}
		},
		async render(region, params) {
			return renderPitchShift(region, params.semitones);
		}
	},

	filter: {
		validateParams(params) {
			if (
				!params ||
				(params.filterType !== "lowpass" &&
					params.filterType !== "highpass") ||
				!Number.isFinite(params.frequency) ||
				params.frequency <= 0 ||
				params.frequency > 24000
			) {
				throw new Error(
					"Invalid filter settings. Use a low-pass or high-pass filter with a frequency between 0 and 24000 Hz."
				);
			}
		},
		async render(region, params) {
			return renderFilter(region, params.filterType, params.frequency);
		}
	}
};

/**
 * Converts a decibel value into a linear amplitude multiplier (e.g. 0 dB -> 1.0).
 *
 * @param {number} db - Decibel value.
 * @returns {number} Linear amplitude factor.
 */
function dbToLinear(db) {
	return Math.pow(10, db / 20);
}

/**
 * Hard-clips every sample across all channels to [-1, 1] in place to prevent digital wrap-around.
 *
 * @param {AudioBuffer} buffer - Buffer to clamp.
 */
function hardLimitInPlace(buffer) {
	for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
		const data = buffer.getChannelData(channel);
		for (let i = 0; i < data.length; i++) {
			if (data[i] > 1) {
				data[i] = 1;
			} else if (data[i] < -1) {
				data[i] = -1;
			}
		}
	}
}

/**
 * Validates the structure and type of items in an effects array.
 *
 * @param {Array<object>} effects - Effects array to validate.
 */
function validateEffectsList(effects) {
	if (!Array.isArray(effects)) {
		throw new Error("Effects must be an array.");
	}
	for (const effect of effects) {
		if (
			!effect ||
			typeof effect.enabled !== "boolean" ||
			!Number.isSafeInteger(effect.order) ||
			effect.order < 0
		) {
			throw new Error("Invalid effect settings.");
		}
	}
}

/**
 * Filters enabled effects and sorts them into deterministic processing order
 * (by order index, then creation time, then ID).
 *
 * @param {Array<object>} effects - Input list of effects.
 * @returns {Array<object>} Filtered and sorted effects.
 */
function getOrderedActiveEffects(effects) {
	return effects
		.filter((effect) => effect.enabled)
		.sort((a, b) => {
			const order = a.order - b.order;
			const created =
				new Date(a.createdAt ?? 0).getTime() -
				new Date(b.createdAt ?? 0).getTime();
			const aId = String(a._id ?? "");
			const bId = String(b._id ?? "");
			return order || created || (aId < bId ? -1 : aId > bId ? 1 : 0);
		});
}

/**
 * Validates that an effect region start and end are finite, non-negative, and fit within audio duration.
 *
 * @param {number} start - Region start in seconds.
 * @param {number} end - Region end in seconds.
 * @param {number} maxDuration - Audio duration limit in seconds.
 */
function validateRegionBounds(start, end, maxDuration) {
	if (
		!Number.isFinite(start) ||
		!Number.isFinite(end) ||
		start < 0 ||
		end <= start ||
		end > maxDuration
	) {
		throw new Error("An effect is outside the audio duration.");
	}
}
