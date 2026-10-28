import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	useCallback
} from "react";

const DEFAULT_TIMESTAMP_COLOUR = "#ff6b4a";

/**
 * Synchronizes annotations with WaveSurfer RegionsPlugin, managing region lifecycles
 * and creating portal DOM mount nodes for React overlay rendering.
 *
 * @param {object|null} regionsPlugin - WaveSurfer RegionsPlugin instance.
 * @param {Array<{ _id: string, start: number, end: number|null, tags: string[], comment: string, colour?: string }>} annotations - Annotations list.
 * @returns {Array<{ id: string, slotElement: HTMLElement, annotation: object, isTimestamp: boolean, region: object }>} Active marker slots.
 */
export const useAnnotationRender = (regionsPlugin, annotations) => {
	// A map to track which annotation data is link to which annotation region
	const drawnRef = useRef(new Map());
	const [markerSlots, setMarkerSlots] = useState([]);

	const refreshMarkerSlots = useCallback(() => {
		const slots = [];
		drawnRef.current.forEach((waveRegion, id) => {
			slots.push({
				id,
				slotElement: waveRegion.__mount,
				annotation: waveRegion.__annotation,
				isTimestamp: waveRegion.__isTimestamp,
				region: waveRegion
			});
		});
		setMarkerSlots(slots);
	}, []);

	useLayoutEffect(() => {
		if (!regionsPlugin) return;

		const drawn = drawnRef.current;
		const annotationIds = new Set(annotations.map((an) => an._id));

		// Delete the regions that no longer in mongo
		for (const [id, waveRegion] of drawn) {
			if (!annotationIds.has(id)) {
				waveRegion.remove();
				drawn.delete(id);
			}
		}

		annotations.forEach((annotation) => {
			const isTimestamp = annotation.end == null;
			const existing = drawn.get(annotation._id);

			// New annotation, OR it just switched between region and timestamp.
			if (!existing || existing.__isTimestamp !== isTimestamp) {
				existing?.remove();
				drawn.set(
					annotation._id,
					createRegion(regionsPlugin, annotation)
				);
				return;
			}

			// Same kind as before: update in place
			const currentEnd = isTimestamp ? annotation.start : annotation.end;
			const newColour = regionColour(annotation, isTimestamp);

			if (
				existing.start !== annotation.start ||
				existing.end !== currentEnd
			) {
				existing.setOptions({
					start: annotation.start,
					end: currentEnd
				});
			}
			if (existing.color !== newColour) {
				existing.setOptions({ color: newColour });
			}
			// Keep tags/comment fresh even if geometry didn't change
			existing.__annotation = annotation;
		});

		refreshMarkerSlots();
	}, [regionsPlugin, annotations, refreshMarkerSlots]);

	useEffect(() => {
		return () => {
			drawnRef.current.forEach((waveRegion) => waveRegion.remove());
			drawnRef.current.clear();
		};
	}, []);

	return markerSlots;
};

// Timestamps are a solid colour, regions a 20% wash of it
const regionColour = (annotation, isTimestamp) =>
	isTimestamp
		? annotation.colour || DEFAULT_TIMESTAMP_COLOUR
		: applyOpacity(annotation.colour, 0.2);

/**
 * Creates a WaveSurfer region element and mounts an isolated child `<div>`
 * for React to safely render markers into via createPortal.
 *
 * @param {object} regionsPlugin - WaveSurfer RegionsPlugin.
 * @param {object} annotation - Source annotation.
 * @returns {object} Created WaveSurfer region with custom `__mount` property.
 */
const createRegion = (regionsPlugin, annotation) => {
	const isTimestamp = annotation.end == null;

	const waveRegion = regionsPlugin.addRegion({
		id: `annotation-${annotation._id}`,
		start: annotation.start,
		...(isTimestamp ? {} : { end: annotation.end }), // a timestamp has no end
		color: regionColour(annotation, isTimestamp),
		drag: false,
		resize: false
	});

	waveRegion.__annotation = annotation;
	waveRegion.__isTimestamp = isTimestamp;

	// React renders into a node it owns, not into wavesurfer's own element.
	// Wavesurfer can remove, clear or rebuild its elements at any time, and
	// React then can't find its children to remove them (removeChild error).
	// display: contents means the mount adds no box, so layout is unchanged.
	const mount = document.createElement("div");
	mount.style.display = "contents";
	waveRegion.element.appendChild(mount);
	waveRegion.__mount = mount;

	return waveRegion;
};

// Helper function to force 20% opacity (alpha = 0.2) on any hex color
const applyOpacity = (hexColor, alpha = 0.2) => {
	if (!hexColor) return `rgba(74, 58, 255, ${alpha})`;
	// Convert 6-digit hex to RGBA
	const hex = hexColor.replace("#", "");
	if (hex.length === 6) {
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	return hexColor;
};
