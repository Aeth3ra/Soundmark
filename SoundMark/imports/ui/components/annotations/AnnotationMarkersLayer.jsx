import { createPortal } from "react-dom";
import { AnnotationMarker } from "./AnnotationMarker";

/**
 * For each empty box wavesurfer created ("marker slot"), tells React
 * to render an <AnnotationMarker> physically inside that box, using
 * createPortal.
 */
export const AnnotationMarkersLayer = ({ markerSlots, tooltipRef }) => {
  return markerSlots.map(
    ({ id, slotElement, annotation, isTimestamp, region }) => {
      if (!slotElement) return null;
      return createPortal(
        <AnnotationMarker
          annotation={annotation}
          isTimestamp={isTimestamp}
          tooltipRef={tooltipRef}
          region={region}
        />,
        slotElement,
        id
      );
    }
  );
};
