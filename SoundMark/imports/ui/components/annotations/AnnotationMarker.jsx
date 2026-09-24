import { useRef, useState, useEffect } from "react";

const REGION_BORDER = "rgba(74, 58, 255, 0.75)";
const COMPACT_WIDTH_THRESHOLD = 46;
const STEM_COLOR = "transparent";

/**
 * Make an annotation marker for an annotation region.
 * Renders differently on whether it is a annotation timestamp or region
 */
export const AnnotationMarker = ({
  region,
  annotation,
  isTimestamp,
  tooltipRef
}) => {
  const wrapperRef = useRef(null);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    // 1. Hover, via wavesurfer's own Region events
    const unsubOver = region?.on("over", () => {
      if (wrapperRef.current) {
        tooltipRef.current?.show(wrapperRef.current, annotation, isTimestamp);
      }
    });

    const unsubLeave = region?.on("leave", () => {
      tooltipRef.current?.hide();
    });

    // 2. Resize Observer
    const el = wrapperRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsCompact(entry.contentRect.width < COMPACT_WIDTH_THRESHOLD);
      }
    });
    if (!isTimestamp && el) observer.observe(el);

    return () => {
      unsubOver?.();
      unsubLeave?.();
      observer.disconnect();
    };
  }, [region, annotation, isTimestamp, tooltipRef]);

  if (isTimestamp) {
    return (
      <div
        ref={wrapperRef}
        className="annotation-marker relative z-20 flex flex-col items-center -translate-x-1/2 cursor-pointer pointer-events-auto"
      >
        <div
          style={{
            position: "absolute",
            width: "12px",
            height: "12px",
            transform: "translateX(-55%)",
            borderRadius: "50%",
            backgroundColor: region.color,
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)"
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "12px",
            bottom: 0,
            width: "15px",
            transform: "translateX(-50%)",
            backgroundColor: STEM_COLOR
          }}
        />
      </div>
    );
  }

  const label = buildAnnotationLabel(annotation);

  return (
    <div
      ref={wrapperRef}
      className="annotation-region absolute inset-0 z-20 flex items-center gap-1 overflow-visible cursor-pointer pointer-events-auto"
      style={{
        width: "100%",
        height: "100%",
        padding: isCompact ? "0" : "0 6px",
        justifyContent: isCompact ? "center" : "flex-start",
        boxSizing: "border-box"
      }}
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

export const buildAnnotationLabel = (annotation) => {
  if (annotation.title) {
    return annotation.title;
  }
  if (annotation.tags?.length) {
    const shown = annotation.tags.slice(0, 2).join(", ");
    const overflow =
      annotation.tags.length > 2 ? ` +${annotation.tags.length - 2}` : "";
    return shown + overflow;
  }
  return annotation.comment || "";
};
