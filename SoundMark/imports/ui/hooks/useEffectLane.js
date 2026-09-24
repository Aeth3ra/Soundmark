import { useMemo } from "react";

const ROW_HEIGHT = 18; // px, adjust to taste

/**
 * Greedy interval packing: walk effects sorted by start time, and place each
 * one in the first row whose last-placed end time is <= this effect's start.
 * This keeps overlapping effects visually separated without needing an
 * explicit "lane" field on the effect document.
 */
function packIntoRows(sortedEffects) {
	const rowEndTimes = []; // rowEndTimes[i] = end time of the last effect placed in row i
	const placements = [];

	for (const effect of sortedEffects) {
		let row = rowEndTimes.findIndex((endTime) => endTime <= effect.start);
		if (row === -1) {
			row = rowEndTimes.length;
			rowEndTimes.push(effect.end);
		} else {
			rowEndTimes[row] = effect.end;
		}
		placements.push({ effect, row });
	}

	return { placements, rowCount: rowEndTimes.length };
}

/**
 * @param waveformWidth - px, from wavesurferInstance.getWrapper().scrollWidth
 *   (same value UserPresenceOverlay uses - keeps every overlay in sync with
 *   however wide wavesurfer is actually rendering, at any zoom level)
 * @param effects - effect docs: { _id, start, end, type, enabled, order, params }
 * @param duration - track duration in seconds
 * @param currentTime - current playback position in seconds
 *
 * Returns { bandSlots, laneHeight } where each bandSlot has pixel left/width,
 * a row index, and an isActive flag for "currently playing through this effect".
 */
export function useEffectsRender(
	waveformWidth,
	effects,
	duration,
	currentTime
) {
	const pxPerSecond =
		duration > 0 && waveformWidth > 0 ? waveformWidth / duration : 0;

	const { placements, rowCount } = useMemo(() => {
		const sorted = [...(effects ?? [])].sort(
			(a, b) => a.start - b.start || a.order - b.order
		);
		return packIntoRows(sorted);
	}, [effects]);

	const bandSlots = useMemo(() => {
		if (pxPerSecond <= 0) return [];

		return placements.map(({ effect, row }) => {
			const left = effect.start * pxPerSecond;
			const width = Math.max(
				2,
				(effect.end - effect.start) * pxPerSecond
			);
			const isActive =
				effect.enabled &&
				currentTime >= effect.start &&
				currentTime <= effect.end;

			return {
				id: effect._id,
				effect,
				left,
				width,
				top: row * ROW_HEIGHT,
				isActive
			};
		});
	}, [placements, duration, pxPerSecond, currentTime]);

	return {
		bandSlots,
		laneHeight: Math.max(ROW_HEIGHT, rowCount * ROW_HEIGHT)
	};
}
