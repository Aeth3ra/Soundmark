import { useEffect, useRef } from "react";

/**
 * Renders the annotations provided using the regions plugin
 * @param {*} regionsPlugin regionsplugin that has been attached to wavesurfer instance
 * @param {Array<{_id, start, end, tags, comment}>} annotations list of annotations
 */
export const useAnnotationRender = (regionsPlugin, annotations) => {
  // A map to track which annotation data is link to which annotation region
  const drawnRef = useRef(new Map());

  useEffect(() => {
    if (!regionsPlugin) return;
    console.log("regionsPlugin:", regionsPlugin);
    console.log("annotations:", annotations);

    const drawn = drawnRef.current;
    const annotationIds = new Set(annotations.map((an) => an._id));

    // Delete the regions that no longer in mongo
    for (const [id, waveRegion] of drawn.entries()) {
      if (!annotationIds.has(id)) {
        waveRegion.remove();
        drawn.delete(id);
      }
    }

    // Render annotations that hasn't been rendered yet
    annotations.forEach((annotation) => {
      const label = annotation.tags?.length
        ? annotation.tags.join(", ")
        : annotation.comment || "";
      const isTimestamp = annotation.end == null;
      const existing = drawn.get(annotation._id);

      if (existing) {
        // If existing, and have different time ranges, update the region's time range
        const currentEnd = isTimestamp ? annotation.start : annotation.end;
        if (
          existing.start !== annotation.start ||
          existing.end !== currentEnd
        ) {
          existing.setOptions({
            start: annotation.start,
            end: currentEnd,
            content: label
          });
        }
        return;
      }

      // Add new annotation region
      const waveRegion = regionsPlugin.addRegion(
        isTimestamp
          ? {
              // Timestamp annotations: no `end` key at all -> wavesurfer draws
              start: annotation.start,
              content: label,
              color: "rgba(255, 107, 74, 0.9)", // coral
              drag: false,
              resize: false
            }
          : {
              start: annotation.start,
              end: annotation.end,
              content: label,
              color: "rgba(74, 58, 255, 0.2)",
              drag: false,
              resize: false
            }
      );
      // Save it into the map
      drawn.set(annotation._id, waveRegion);
    });
  }, [regionsPlugin, annotations]);
};
