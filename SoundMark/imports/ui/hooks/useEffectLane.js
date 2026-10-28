import { useMemo } from "react";

const ROW_HEIGHT = 18; // px, adjust to taste

/**
 * Packs overlapping intervals into non-colliding visual rows using greedy interval packing.
 * Sorts effects by start time and places each into the first available row where previous end <= current start.
 *
 * @param {Array<object>} sortedEffects - Effects pre-sorted by start time.
 * @returns {{ placements: Array<{ effect: object, row: number }>, rowCount: number }}
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
 * Calculates pixel positions, lane row allocations, and active playback status
 * for rendering visual effect bands over the timeline.
 *
 * @param {number} waveformWidth - Current pixel width from WaveSurfer container.
 * @param {Array<object>} effects - Effect documents to lay out.
 * @param {number} duration - Track duration in seconds.
 * @param {number} currentTime - Current playback position in seconds.
 * @returns {{ bandSlots: Array<{ id: string, effect: object, left: number, width: number, top: number, isActive: boolean }>, laneHeight: number }}
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
