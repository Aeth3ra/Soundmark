import { useEffect, useState } from "react";

/**
 * Reactively tracks the DOM scroll width of the WaveSurfer wrapper element across zoom and redraw events.
 *
 * @param {object|null} wavesurferInstance - WaveSurfer instance.
 * @returns {number} Current waveform scroll width in pixels.
 */
export function useWaveformWidth(wavesurferInstance) {
	const [waveformWidth, setWaveformWidth] = useState(
		() => wavesurferInstance?.getWrapper()?.scrollWidth ?? 0
	);

	useEffect(() => {
		if (!wavesurferInstance) return;

		const updateWidth = () => {
			setWaveformWidth(wavesurferInstance.getWrapper()?.scrollWidth ?? 0);
		};

		updateWidth();
		wavesurferInstance.on("zoom", updateWidth);
		wavesurferInstance.on("redraw", updateWidth);

		return () => {
			wavesurferInstance.un("zoom", updateWidth);
			wavesurferInstance.un("redraw", updateWidth);
		};
	}, [wavesurferInstance]);

	return waveformWidth;
}
