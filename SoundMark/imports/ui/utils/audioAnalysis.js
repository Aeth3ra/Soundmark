import Meyda from "meyda";

/**
 * Measures the RMS level and absolute peak amplitude across all channels
 * of an AudioBuffer without mixing down to mono.
 *
 * @param {AudioBuffer} audioBuffer - Decoded audio buffer to analyze.
 * @returns {{ rms: number, peak: number }} Measured RMS energy and peak amplitude.
 * @throws {Error} If the buffer is empty, contains non-finite samples, or RMS cannot be computed.
 */
export function measureAudioBuffer(audioBuffer) {
	if (!audioBuffer?.length || !audioBuffer.numberOfChannels) {
		throw new Error("Audio buffer is empty.");
	}

	const frameSize = 2048;
	// Meyda.extract uses settings on `this`. Keep this measurement's settings
	// and derived filter banks separate from the existing key analysis.
	const analyser = {
		...Meyda,
		bufferSize: frameSize,
		sampleRate: audioBuffer.sampleRate,
		windowingFunction: "rect",
		barkScale: undefined,
		melFilterBank: undefined,
		chromaFilterBank: undefined
	};
	const frame = new Float32Array(frameSize);
	let energy = 0;
	let peak = 0;

	for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
		const samples = audioBuffer.getChannelData(channel);

		for (let offset = 0; offset < samples.length; offset += frameSize) {
			const count = Math.min(frameSize, samples.length - offset);
			frame.fill(0);
			frame.set(samples.subarray(offset, offset + count));

			for (let index = 0; index < count; index++) {
				if (!Number.isFinite(frame[index])) {
					throw new Error("Audio contains an invalid sample.");
				}
				peak = Math.max(peak, Math.abs(frame[index]));
			}

			const rms = analyser.extract("rms", frame);
			if (!Number.isFinite(rms)) {
				throw new Error("Could not measure the audio RMS.");
			}

			// Recover this frame's energy. Zero padding adds no energy.
			energy += rms * rms * frameSize;
		}
	}

	// Count only real samples, including every channel.
	const sampleCount = audioBuffer.length * audioBuffer.numberOfChannels;
	return { rms: Math.sqrt(energy / sampleCount), peak };
}

const NOTE_NAMES = [
	"C",
	"C#",
	"D",
	"D#",
	"E",
	"F",
	"F#",
	"G",
	"G#",
	"A",
	"A#",
	"B"
];
const MAJOR_PROFILE = [
	6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88
];
const MINOR_PROFILE = [
	6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Creates a bounded slice descriptor from an AudioBuffer for region-specific DSP analysis.
 *
 * @param {AudioBuffer} audioBuffer - Source decoded audio buffer.
 * @param {number} startSeconds - Region start offset in seconds.
 * @param {number} endSeconds - Region end offset in seconds.
 * @returns {{ channels: Float32Array[], sampleRate: number, startSample: number, length: number, duration: number } | null}
 */
const createRegionSource = (audioBuffer, startSeconds, endSeconds) => {
	if (!audioBuffer || !audioBuffer.sampleRate || !audioBuffer.length)
		return null;

	const start = clamp(
		Math.min(startSeconds, endSeconds),
		0,
		audioBuffer.duration
	);
	const end = clamp(
		Math.max(startSeconds, endSeconds),
		0,
		audioBuffer.duration
	);
	const startSample = Math.floor(start * audioBuffer.sampleRate);
	const endSample = Math.min(
		audioBuffer.length,
		Math.ceil(end * audioBuffer.sampleRate)
	);
	const channels = Array.from(
		{ length: audioBuffer.numberOfChannels },
		(_, channel) => audioBuffer.getChannelData(channel)
	);

	if (endSample <= startSample || channels.length === 0) return null;

	return {
		channels,
		sampleRate: audioBuffer.sampleRate,
		startSample,
		length: endSample - startSample,
		duration: end - start
	};
};

/**
 * Returns a mono downmixed sample from the region at the specified sample offset.
 *
 * @param {object} source - Region source descriptor.
 * @param {number} regionIndex - Region-relative sample index.
 * @returns {number} Downmixed mono sample value.
 */
const readMonoSample = (source, regionIndex) => {
	const sourceIndex = source.startSample + regionIndex;
	let sample = 0;

	for (const channel of source.channels) sample += channel[sourceIndex] || 0;
	return sample / source.channels.length;
};

/**
 * Quick RMS estimate using strided sampling across the region.
 *
 * @param {object} source - Region source descriptor.
 * @returns {number} Estimated RMS amplitude.
 */
const regionRms = (source) => {
	const stride = Math.max(1, Math.floor(source.length / 100000));
	let energy = 0;
	let count = 0;

	for (let index = 0; index < source.length; index += stride) {
		const sample = readMonoSample(source, index);
		energy += sample * sample;
		count += 1;
	}

	return count ? Math.sqrt(energy / count) : 0;
};

/**
 * Estimates region tempo (BPM) using envelope tracking, onset detection,
 * normalized cross-correlation, and octave error correction.
 *
 * @param {object} source - Region source descriptor.
 * @returns {number|null} Estimated tempo in BPM, or null if uncertain/unvoiced.
 */
export const estimateBpm = (source) => {
	if (source.duration < 2) return null;

	// --- 1. FEATURE EXTRACTION: 100Hz RMS Envelope ---
	// Using a fixed 100Hz rate standardizes the math regardless of the audio sample rate.
	const envelopeRate = 100;
	const hopSize = Math.floor(source.sampleRate / envelopeRate);
	// Use overlapping frames (hop * 2) to prevent missing transient peaks that straddle a boundary.
	const frameSize = hopSize * 2;
	const numFrames = Math.floor((source.length - frameSize) / hopSize);
	if (numFrames < 100) return null; // Too short to analyze

	const frameEnergy = new Float32Array(numFrames);

	for (let f = 0; f < numFrames; f++) {
		const offset = f * hopSize;
		let sumSq = 0;
		for (let i = 0; i < frameSize; i++) {
			const sample = readMonoSample(source, offset + i);
			sumSq += sample * sample;
		}
		frameEnergy[f] = Math.sqrt(sumSq / frameSize);
	}

	// --- 2. ONSET FLUX CALCULATION ---
	// A half-wave rectified first-order difference isolates drum hits and note attacks
	// by keeping only sudden increases in energy, ignoring the decaying tails.
	const onsets = new Float32Array(numFrames);
	for (let i = 1; i < numFrames; i++) {
		const diff = frameEnergy[i] - frameEnergy[i - 1];
		onsets[i] = diff > 0 ? diff : 0;
	}

	// --- 3. NORMALIZED CROSS-CORRELATION ---
	const minBpm = 60;
	const maxBpm = 200;
	const minLag = Math.floor((envelopeRate * 60) / maxBpm);
	const maxLag = Math.ceil((envelopeRate * 60) / minBpm);

	// Store scores to allow looking backward for the octave correction
	const scores = new Float32Array(maxLag + 1);
	let bestLag = 0;
	let bestScore = 0;

	for (let lag = minLag; lag <= maxLag; lag++) {
		let correlation = 0;
		let earlierEnergy = 0;
		let laterEnergy = 0;

		for (let i = lag; i < numFrames; i++) {
			const earlier = onsets[i - lag];
			const later = onsets[i];
			correlation += earlier * later;
			earlierEnergy += earlier * earlier;
			laterEnergy += later * later;
		}

		// Normalization ensures the math doesn't automatically favor shorter lags (faster BPMs)
		// just because they have more loop iterations.
		const denominator = Math.sqrt(earlierEnergy * laterEnergy);
		const score = denominator ? correlation / denominator : 0;

		scores[lag] = score;

		if (score > bestScore) {
			bestScore = score;
			bestLag = lag;
		}
	}

	// Strict confidence gate to reject spoken word/ambient noise
	if (!bestLag || bestScore < 0.15) return null;

	// --- 4. OCTAVE ERROR (TEMPO HALVING) CORRECTION ---
	// Sometimes the math prefers the Kick-to-Kick correlation (e.g., 60 BPM)
	// over the Kick-to-Snare correlation (e.g., 120 BPM). We force it to check
	// if exactly double the tempo is also a dominant rhythmic peak.
	const halfLag = Math.round(bestLag / 2);

	if (halfLag >= minLag) {
		let localMaxScore = 0;
		let localMaxLag = halfLag;

		// Scan a tiny 50ms window around the half-lag to account for groove/swing drift
		for (let l = halfLag - 2; l <= halfLag + 2; l++) {
			if (scores[l] > localMaxScore) {
				localMaxScore = scores[l];
				localMaxLag = l;
			}
		}

		// If the peak at double the tempo is at least 50% as strong as the main peak,
		// we override the winner to prevent the 120 -> 60 tempo halving trap.
		if (localMaxScore > bestScore * 0.5) {
			bestLag = localMaxLag;
		}
	}

	return Math.round((60 * envelopeRate) / bestLag);
};

/**
 * Calculates fundamental frequency using the YIN pitch detection algorithm.
 * Applies difference calculation, cumulative mean normalization, absolute thresholding,
 * and parabolic interpolation for sub-sample accuracy.
 *
 * @param {Float32Array} frame - Mono audio sample window.
 * @param {number} sampleRate - Effective sample rate of the frame.
 * @param {number} [threshold=0.15] - Minimum dip threshold for periodicity detection.
 * @returns {number|null} Estimated fundamental frequency in Hz, or null if unvoiced/noise.
 */
const estimateFramePitchYin = (frame, sampleRate, threshold = 0.15) => {
	const halfLen = Math.floor(frame.length / 2);
	const diff = new Float32Array(halfLen);

	// Step 1: Difference function d(tau)
	for (let tau = 0; tau < halfLen; tau++) {
		let sum = 0;
		for (let i = 0; i < halfLen; i++) {
			const delta = frame[i] - frame[i + tau];
			sum += delta * delta;
		}
		diff[tau] = sum;
	}

	// Step 2: Cumulative mean normalized difference function d'(tau)
	const normDiff = new Float32Array(halfLen);
	normDiff[0] = 1;
	let runningSum = 0;

	for (let tau = 1; tau < halfLen; tau++) {
		runningSum += diff[tau];
		normDiff[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum;
	}

	// Step 3: Absolute thresholding (first dip below threshold)
	const minLag = Math.max(1, Math.floor(sampleRate / 2000)); // ~2000 Hz upper limit
	const maxLag = Math.min(Math.floor(sampleRate / 50), halfLen - 2); // ~50 Hz lower limit
	let bestLag = 0;

	for (let tau = minLag; tau <= maxLag; tau++) {
		if (normDiff[tau] < threshold) {
			while (tau + 1 <= maxLag && normDiff[tau + 1] < normDiff[tau]) {
				tau++; // Walk to local minimum
			}
			bestLag = tau;
			break;
		}
	}

	// Fallback to global minimum if no value dipped below threshold
	if (!bestLag) {
		let minVal = Infinity;
		for (let tau = minLag; tau <= maxLag; tau++) {
			if (normDiff[tau] < minVal) {
				minVal = normDiff[tau];
				bestLag = tau;
			}
		}
		if (minVal > 0.45) return null; // Unvoiced / noise frame
	}

	// Step 4: Parabolic interpolation for sub-sample accuracy
	const s0 = normDiff[bestLag - 1];
	const s1 = normDiff[bestLag];
	const s2 = normDiff[bestLag + 1];
	const denom = s0 - 2 * s1 + s2;
	const delta = denom !== 0 ? (s0 - s2) / (2 * denom) : 0;

	const refinedLag = bestLag + clamp(delta, -1, 1);
	return sampleRate / refinedLag;
};

/**
 * Estimates the dominant pitch and musical note of a region by sampling
 * frames across the region using YIN pitch detection and finding the modal note.
 *
 * @param {object} source - Region source descriptor.
 * @returns {string|null} Musical note and frequency (e.g. "A4 (440 Hz)"), or null if unpitched.
 */
const estimatePitch = (source) => {
	const decimation = Math.max(1, Math.ceil(source.sampleRate / 12000));
	const analysisSampleRate = source.sampleRate / decimation;
	const frameSize = Math.min(2048, Math.floor(source.length / decimation));
	if (frameSize < 256) return null;

	const sourceFrameLength = frameSize * decimation;
	const frameCount = Math.min(
		32,
		Math.max(1, Math.floor(source.length / sourceFrameLength))
	);
	const detected = [];

	for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
		const availableOffset = Math.max(0, source.length - sourceFrameLength);
		const frameOffset =
			frameCount === 1
				? Math.floor(availableOffset / 2)
				: Math.floor((availableOffset * frameIndex) / (frameCount - 1));
		const frame = new Float32Array(frameSize);

		for (let index = 0; index < frameSize; index += 1) {
			frame[index] = readMonoSample(
				source,
				frameOffset + index * decimation
			);
		}

		const frequency = estimateFramePitchYin(frame, analysisSampleRate);
		if (frequency && Number.isFinite(frequency)) detected.push(frequency);
	}

	if (detected.length === 0) return null;

	const notes = new Map();
	for (const frequency of detected) {
		const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
		if (midi < 0 || midi > 127) continue;
		const entry = notes.get(midi) || { count: 0, frequencies: [] };
		entry.count += 1;
		entry.frequencies.push(frequency);
		notes.set(midi, entry);
	}

	if (notes.size === 0) return null;

	const [midi, result] = [...notes.entries()].sort(
		(first, second) => second[1].count - first[1].count
	)[0];
	result.frequencies.sort((first, second) => first - second);
	const frequency =
		result.frequencies[Math.floor(result.frequencies.length / 2)];
	const note = NOTE_NAMES[(midi + 120) % 12];
	const octave = Math.floor(midi / 12) - 1;

	return `${note}${octave} (${Math.round(frequency)} Hz)`;
};

/**
 * Computes Pearson correlation between a 12-dimensional chroma vector
 * and a key profile rotated to a candidate root note.
 *
 * @param {number[]} chroma - 12-bin chroma energy distribution.
 * @param {number[]} profile - 12-bin key profile weights.
 * @param {number} root - Semitone pitch offset (0-11).
 * @returns {number} Normalized correlation score.
 */
const correlationWithProfile = (chroma, profile, root) => {
	const chromaMean =
		chroma.reduce((sum, value) => sum + value, 0) / chroma.length;
	const profileMean =
		profile.reduce((sum, value) => sum + value, 0) / profile.length;
	let numerator = 0;
	let chromaEnergy = 0;
	let profileEnergy = 0;

	for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
		const chromaValue = chroma[pitchClass] - chromaMean;
		const profileValue =
			profile[(pitchClass - root + 12) % 12] - profileMean;
		numerator += chromaValue * profileValue;
		chromaEnergy += chromaValue * chromaValue;
		profileEnergy += profileValue * profileValue;
	}

	const denominator = Math.sqrt(chromaEnergy * profileEnergy);
	return denominator ? numerator / denominator : -Infinity;
};

/**
 * Detects the musical key and mode (major/minor) using Meyda chroma analysis
 * and Krumhansl-Schmuckler key profile correlation.
 *
 * @param {object} source - Region source descriptor.
 * @returns {string|null} Detected key (e.g. "C major", "A minor"), or null if undetectable.
 */
const estimateKey = (source) => {
	const maximumFrameSize = 4096;
	const availablePower = Math.floor(Math.log2(source.length));
	const frameSize = Math.min(maximumFrameSize, 2 ** availablePower);
	if (frameSize < 512) return null;

	const frameCount = Math.min(
		48,
		Math.max(1, Math.floor(source.length / frameSize))
	);
	const chroma = new Array(12).fill(0);
	let totalWeight = 0;

	Meyda.bufferSize = frameSize;
	Meyda.sampleRate = source.sampleRate;
	Meyda.chromaFilterBank = undefined;

	for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
		const availableOffset = Math.max(0, source.length - frameSize);
		const frameOffset =
			frameCount === 1
				? Math.floor(availableOffset / 2)
				: Math.floor((availableOffset * frameIndex) / (frameCount - 1));
		const frame = new Float32Array(frameSize);

		for (let index = 0; index < frameSize; index += 1) {
			frame[index] = readMonoSample(source, frameOffset + index);
		}

		const features = Meyda.extract(["chroma", "rms"], frame);
		if (!features?.chroma || !features.rms || features.rms < 0.001)
			continue;

		for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
			chroma[pitchClass] += features.chroma[pitchClass] * features.rms;
		}
		totalWeight += features.rms;
	}

	if (!totalWeight) return null;
	for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
		chroma[pitchClass] /= totalWeight;
	}

	let best = { score: -Infinity, root: 0, mode: "major" };
	for (let root = 0; root < 12; root += 1) {
		const majorScore = correlationWithProfile(chroma, MAJOR_PROFILE, root);
		const minorScore = correlationWithProfile(chroma, MINOR_PROFILE, root);
		if (majorScore > best.score)
			best = { score: majorScore, root, mode: "major" };
		if (minorScore > best.score)
			best = { score: minorScore, root, mode: "minor" };
	}

	return Number.isFinite(best.score)
		? `${NOTE_NAMES[best.root]} ${best.mode}`
		: null;
};

/**
 * Analyzes an audio region to calculate duration, tempo (BPM), dominant pitch,
 * and musical key.
 *
 * @param {AudioBuffer} audioBuffer - Full decoded track AudioBuffer.
 * @param {number} startSeconds - Selection start in seconds.
 * @param {number} endSeconds - Selection end in seconds.
 * @returns {{ duration: number, bpm: number|null, pitch: string|null, key: string|null }} Region metrics.
 */
export const analyseRegion = (audioBuffer, startSeconds, endSeconds) => {
	const source = createRegionSource(audioBuffer, startSeconds, endSeconds);
	const duration = Math.max(0, Math.abs(endSeconds - startSeconds));

	if (!source) return { duration, bpm: null, pitch: null, key: null };
	if (regionRms(source) < 0.0001) {
		return { duration: source.duration, bpm: null, pitch: null, key: null };
	}

	return {
		duration: source.duration,
		bpm: estimateBpm(source),
		pitch: estimatePitch(source),
		key: estimateKey(source)
	};
};
