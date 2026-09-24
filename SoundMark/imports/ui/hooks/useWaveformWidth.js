import { useEffect, useState } from "react";

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
