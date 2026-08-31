import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Renders the annotations provided using the regions plugin
 * @param {*} regionsPlugin regionsplugin that has been attached to wavesurfer instance
 * @param {Array<{_id, start, end, tags, comment}>} annotations list of annotations
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
        slotElement: waveRegion.element, // the empty box wavesurfer created
        annotation: waveRegion.__annotation,
        isTimestamp: waveRegion.__isTimestamp
      });
    });
    setMarkerSlots(slots);
  }, []);

  useEffect(() => {
    if (!regionsPlugin) return;

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
      const isTimestamp = annotation.end == null;
      const existing = drawn.get(annotation._id);

      if (existing) {
        // Update time range if it changed
        const currentEnd = isTimestamp ? annotation.start : annotation.end;
        if (
          existing.start !== annotation.start ||
          existing.end !== currentEnd
        ) {
          existing.setOptions({ start: annotation.start, end: currentEnd });
        }
        // Keep tags/comment fresh even if geometry didn't change
        existing.__annotation = annotation;
        return;
      }

      // Create an empty box on the waveform - no content yet.
      // React fills it in via AnnotationMarkersLayer below.
      const waveRegion = regionsPlugin.addRegion(
        isTimestamp
          ? {
              id: `annotation-${annotation._id}`,
              start: annotation.start,
              color: annotation.colour || "#ff6b4a",
              drag: false,
              resize: false
            }
          : {
              id: `annotation-${annotation._id}`,
              start: annotation.start,
              end: annotation.end,
              color: applyOpacity(annotation.colour, 0.2),
              drag: false,
              resize: false
            }
      );
      // Save it into the map
      waveRegion.__annotation = annotation;
      waveRegion.__isTimestamp = isTimestamp;
      drawn.set(annotation._id, waveRegion);
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
