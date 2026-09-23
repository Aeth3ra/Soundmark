import { measureAudioBuffer } from "./audioAnalysis";
import { Offline, ToneBufferSource, PitchShift } from "tone";

/**
 * Copies the [startSeconds, endSeconds) range out of a decoded AudioBuffer
 * into a new, standalone AudioBuffer
 *
 * @param {AudioBuffer} audioBuffer - full decoded track from the source file
 * @param {number} startSeconds
 * @param {number} endSeconds
 * @returns {AudioBuffer} a new buffer containing just the selected region
 */
export function sliceAudioBuffer(audioBuffer, startSeconds, endSeconds) {
	const sampleRate = audioBuffer.sampleRate;
	const start = Math.max(0, Math.min(startSeconds, endSeconds));
	const end = Math.min(audioBuffer.duration, Math.max(startSeconds, endSeconds));

	const startSample = Math.floor(start * sampleRate);
	const endSample = Math.min(audioBuffer.length, Math.ceil(end * sampleRate));
	const frameCount = endSample - startSample;

	if (frameCount <= 0) {
		throw new Error("Selected region is empty.");
	}

	const sliced = new AudioBuffer({
		numberOfChannels: audioBuffer.numberOfChannels,
		length: frameCount,
		sampleRate,
	});

	for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
		const sourceData = audioBuffer.getChannelData(channel);
		const slicedData = sliced.getChannelData(channel);
		slicedData.set(sourceData.subarray(startSample, endSample));
	}

	return sliced;
}

// Render one region through a GainNode, preserving its channel layout
async function renderGain(audioBuffer, gain) {
	const OfflineContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!OfflineContext) {
		throw new Error("This browser does not support offline audio processing.");
	}

	const context = new OfflineContext(
		audioBuffer.numberOfChannels,
		audioBuffer.length,
		audioBuffer.sampleRate,
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
 * Pitch-shifts an AudioBuffer by the requested number of semitones.
 *
 * The rendered buffer has the same duration, channel count and sample rate
 * as the input. The input buffer is never modified.
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
				windowSize: 0.05,
			});

			source.connect(pitchShift);
			pitchShift.toDestination();
			source.start(0);
		},
		audioBuffer.duration,
		audioBuffer.numberOfChannels,
		audioBuffer.sampleRate,
	);

	return rendered.get();
}

/**
 * Applies a low-pass or high-pass filter to an AudioBuffer.
 *
 * The rendered buffer has the same duration, channel count and sample rate
 * as the input. The input buffer is never modified.
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
			`Filter frequency must be below ${audioBuffer.sampleRate / 2} Hz for this audio.`,
		);
	}

	const OfflineContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;

	if (!OfflineContext) {
		throw new Error("This browser does not support offline audio processing.");
	}

	const context = new OfflineContext(
		audioBuffer.numberOfChannels,
		audioBuffer.length,
		audioBuffer.sampleRate,
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

/** Apply saved effects to the full track. The source buffer is never mutated */
export async function applyEffectsChain(audioBuffer, effects = []) {
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

	const ordered = effects
		.filter((effect) => effect.enabled)
		.sort((a, b) => {
			const order = a.order - b.order;
			const created =
				new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
			const aId = String(a._id ?? "");
			const bId = String(b._id ?? "");
			return order || created || (aId < bId ? -1 : aId > bId ? 1 : 0);
		});
	if (ordered.length === 0) return audioBuffer;

	const output = new AudioBuffer({
		numberOfChannels: audioBuffer.numberOfChannels,
		length: audioBuffer.length,
		sampleRate: audioBuffer.sampleRate,
	});
	for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
		output.getChannelData(channel).set(audioBuffer.getChannelData(channel));
	}

	for (const effect of ordered) {
		if (
			effect.type !== "normalize" &&
			effect.type !== "amplify" &&
			effect.type !== "pitchShift" &&
			effect.type !== "filter"
		) {
			throw new Error(`Rendering ${effect.type} effects is not implemented yet.`);
		}

		const { start, end, params } = effect;

		if (
			!Number.isFinite(start) ||
			!Number.isFinite(end) ||
			start < 0 ||
			end <= start ||
			end > output.duration
		) {
			throw new Error("An effect is outside the audio duration.");
		}

		if (effect.type === "normalize") {
			if (
				!params ||
				params.mode !== "rms" ||
				!Number.isFinite(params.targetRms) ||
				params.targetRms <= 0 ||
				params.targetRms > 1
			) {
				throw new Error(
					"Invalid normalisation settings. Recreate this effect " +
						"with a target RMS greater than 0 and at most 1.",
				);
			}
		} else if (effect.type === "amplify") {
			if (!params || !Number.isFinite(params.gain) || params.gain < 0 || params.gain > 4) {
				throw new Error("Invalid amplification settings. Use a gain between 0 and 4.");
			}
		} else if (effect.type === "pitchShift") {
			if (
				!params ||
				!Number.isFinite(params.semitones) ||
				params.semitones < -24 ||
				params.semitones > 24
			) {
				throw new Error("Invalid pitch shift. Use a value between -24 and 24 semitones.");
			}
		} else if (effect.type === "filter") {
			if (
				!params ||
				(params.filterType !== "lowpass" && params.filterType !== "highpass") ||
				!Number.isFinite(params.frequency) ||
				params.frequency <= 0 ||
				params.frequency > 24000
			) {
				throw new Error(
					"Invalid filter settings. Use a low-pass or high-pass filter with a frequency between 0 and 24000 Hz.",
				);
			}
		}

		const region = sliceAudioBuffer(output, start, end);
		const { rms, peak } = measureAudioBuffer(region);

		if (rms === 0) continue;

		let rendered;

		if (effect.type === "pitchShift") {
			rendered = await renderPitchShift(region, params.semitones);
		} else if (effect.type === "filter") {
			rendered = await renderFilter(region, params.filterType, params.frequency);
		} else {
			const gain = effect.type === "normalize" ? params.targetRms / rms : params.gain;

			if (!Number.isFinite(Math.fround(gain))) {
				throw new Error("This region is too quiet to normalise with a GainNode.");
			}

			if (peak * gain > 1 + 1e-6) {
				if (effect.type === "amplify") {
					throw new Error(
						`This gain would clip. Choose a gain of ${1 / peak}× or lower.`,
					);
				}

				const maximumRms = rms / peak;

				throw new Error(
					`This target would clip. Choose a target RMS of ${maximumRms} or lower.`,
				);
			}

			rendered = await renderGain(region, gain);
		}

		const startSample = Math.floor(start * output.sampleRate);

		for (let channel = 0; channel < output.numberOfChannels; channel++) {
			output.getChannelData(channel).set(rendered.getChannelData(channel), startSample);
		}
	}

	return output;
}

const writeString = (view, offset, string) => {
	for (let i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
};

/**
 * Encodes an AudioBuffer as an uncompressed 16-bit PCM WAV Blob
 */
export function encodeWavBlob(audioBuffer) {
	const numChannels = audioBuffer.numberOfChannels;
	const sampleRate = audioBuffer.sampleRate;
	const numFrames = audioBuffer.length;
	const bytesPerSample = 2;
	const blockAlign = numChannels * bytesPerSample;
	const dataSize = numFrames * blockAlign;

	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	writeString(view, 0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	writeString(view, 8, "WAVE");
	writeString(view, 12, "fmt ");
	view.setUint32(16, 16, true); // fmt chunk size (PCM)
	view.setUint16(20, 1, true); // audio format: 1 = PCM
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * blockAlign, true); // byte rate
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bytesPerSample * 8, true); // bits per sample
	writeString(view, 36, "data");
	view.setUint32(40, dataSize, true);

	const channelData = [];
	for (let channel = 0; channel < numChannels; channel++) {
		channelData.push(audioBuffer.getChannelData(channel));
	}

	let offset = 44;
	for (let frame = 0; frame < numFrames; frame++) {
		for (let channel = 0; channel < numChannels; channel++) {
			const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
			view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
			offset += 2;
		}
	}

	return new Blob([buffer], { type: "audio/wav" });
}

export function secondsToFileLabel(seconds) {
	const total = Math.max(0, Math.round(seconds));
	const minutes = Math.floor(total / 60);
	const secs = total % 60;
	return minutes > 0 ? `${minutes}m${secs.toString().padStart(2, "0")}s` : `${secs}s`;
}
