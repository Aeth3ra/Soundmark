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
    const end = Math.min(
        audioBuffer.duration,
        Math.max(startSeconds, endSeconds)
    );

    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.min(audioBuffer.length, Math.ceil(end * sampleRate));
    const frameCount = endSample - startSample;

    if (frameCount <= 0) {
        throw new Error("Selected region is empty.");
    }

    const sliced = new AudioBuffer({
        numberOfChannels: audioBuffer.numberOfChannels,
        length: frameCount,
        sampleRate
    });

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel);
        const slicedData = sliced.getChannelData(channel);
        slicedData.set(sourceData.subarray(startSample, endSample));
    }

    return sliced;
}

const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

/**
 * Encodes an AudioBuffer as an uncompressed 16-bit PCM WAV Blob with standard RIFF headers.
 *
 * @param {AudioBuffer} audioBuffer - Buffer to encode.
 * @returns {Blob} WAV-encoded audio file Blob.
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

    // 44-byte canonical WAV header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size (16 for PCM)
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

    // Interleave channels and convert 32-bit float samples to 16-bit signed PCM
    let offset = 44;
    for (let frame = 0; frame < numFrames; frame++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(
                -1,
                Math.min(1, channelData[channel][frame])
            );
            view.setInt16(
                offset,
                sample < 0 ? sample * 0x8000 : sample * 0x7fff,
                true
            );
            offset += 2;
        }
    }

    return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Creates an exact, independent copy of an AudioBuffer.
 *
 * @param {AudioBuffer} source - AudioBuffer to clone.
 * @returns {AudioBuffer} Cloned AudioBuffer.
 */
export function cloneAudioBuffer(source) {
    const clone = new AudioBuffer({
        numberOfChannels: source.numberOfChannels,
        length: source.length,
        sampleRate: source.sampleRate
    });
    for (let channel = 0; channel < source.numberOfChannels; channel++) {
        clone.getChannelData(channel).set(source.getChannelData(channel));
    }
    return clone;
}

/**
 * Overwrites a section of a target AudioBuffer with data from a source AudioBuffer starting at `startSeconds`.
 *
 * @param {AudioBuffer} target - Destination AudioBuffer (modified in place).
 * @param {AudioBuffer} source - Replacement AudioBuffer.
 * @param {number} startSeconds - Insertion offset in seconds.
 */
export function spliceAudioBuffer(target, source, startSeconds) {
    const startSample = Math.floor(startSeconds * target.sampleRate);
    for (let channel = 0; channel < target.numberOfChannels; channel++) {
        target
            .getChannelData(channel)
            .set(source.getChannelData(channel), startSample);
    }
}

/**
 * Formats seconds into a filesystem-friendly duration label (e.g. "1m23s" or "45s").
 *
 * @param {number} seconds - Duration in seconds.
 * @returns {string} Formatted label string.
 */
export function secondsToFileLabel(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return minutes > 0
        ? `${minutes}m${secs.toString().padStart(2, "0")}s`
        : `${secs}s`;
}
