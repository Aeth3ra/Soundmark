import { useRef, useState, useEffect } from "react";

const TIMESTAMP_COLOR = "#ff6b4a";
const REGION_BORDER = "rgba(74, 58, 255, 0.75)";
const COMPACT_WIDTH_THRESHOLD = 46;

/**
 * Make an annotation marker for an annotation region.
 * Renders differently on whether it is a annotation timestamp or region
 */
export const AnnotationMarker = ({ annotation, isTimestamp, tooltipRef }) => {
  const wrapperRef = useRef(null);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    // Runs once/whether it is timestamp or not
    if (isTimestamp || !wrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        //Everytime element size change
        setIsCompact(entry.contentRect.width < COMPACT_WIDTH_THRESHOLD); //If element is too small, set compact to true else false
      }
    });
    observer.observe(wrapperRef.current); //subscribe to observer
    return () => observer.disconnect(); // Clean up function
  }, [isTimestamp]);

  const handleMouseEnter = () =>
    //Function that shows tooltip if entering region
    tooltipRef.current?.show(wrapperRef.current, annotation, isTimestamp);
  const handleMouseLeave = () => tooltipRef.current?.hide(); // Hides tooltip upon leaving

  if (isTimestamp) {
    //Render this if the annotation is a timestamp
    return (
      <div
        ref={wrapperRef}
        className="annotation-marker relative z-20 flex flex-col items-center -translate-x-1/2 cursor-pointer pointer-events-auto"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Circle */}
        <div
          style={{
            position: "absolute",
            width: "12px",
            height: "12px",
            transform: "translateX(-55%)",
            borderRadius: "50%",
            backgroundColor: TIMESTAMP_COLOR,
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)"
          }}
        />
      </div>
    );
  }

  const label = buildAnnotationLabel(annotation); // Label for annotation region

  return (
    // Render this if it is a region
    <div
      ref={wrapperRef}
      className="annotation-region absolute inset-0 z-20 flex items-center gap-1 overflow-hidden cursor-pointer pointer-events-auto"
      style={{
        width: "100%",
        height: "100%",
        padding: isCompact ? "0" : "0 6px",
        justifyContent: isCompact ? "center" : "flex-start",
        boxSizing: "border-box"
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: REGION_BORDER }}
      />

      {!isCompact && (
        <span className="truncate text-[10px] font-medium leading-none text-base-content/80">
          {label}
        </span>
      )}
    </div>
  );
};

//HELPERS
//Makes the label for the marker
export const buildAnnotationLabel = (annotation) => {
  if (annotation.tags?.length) {
    const shown = annotation.tags.slice(0, 2).join(", ");
    const overflow =
      annotation.tags.length > 2 ? ` +${annotation.tags.length - 2}` : "";
    return shown + overflow;
  }
  return annotation.comment || "";
};
