import { forwardRef, useImperativeHandle, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { formatTime } from "../../utils/time";

/**
 * Tooltip that appears upon hovering annotation marker
 */
export const AnnotationTooltip = forwardRef((props, ref) => {
  const [state, setState] = useState(null); // { annotation, isTimestamp, top, left, ready } | null

  const elRef = useRef(null);

  useImperativeHandle(ref, () => ({
    show(targetEl, annotation, isTimestamp) {
      // For Annotation Marker to show tooltip
      const rect = targetEl.getBoundingClientRect();

      setState({
        annotation,
        isTimestamp,
        top: rect.top,
        left: rect.left,
        ready: false
      });

      requestAnimationFrame(() => {
        if (!elRef.current) return; // tooltip may have been hidden already
        const tooltipRect = elRef.current.getBoundingClientRect();

        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        left = Math.max(
          8,
          Math.min(left, window.innerWidth - tooltipRect.width - 8)
        );

        const top = Math.max(8, rect.top - tooltipRect.height - 10);

        setState({ annotation, isTimestamp, top, left, ready: true });
      });
    },
    hide() {
      // For Annotation Marker to hide tooltip
      setState(null);
    }
  }));

  if (!state) return null; //Skip if not hovered on

  const { annotation, isTimestamp, top, left, ready } = state;

  const timeLabel = isTimestamp
    ? formatTime(annotation.start)
    : `${formatTime(annotation.start)} - ${formatTime(annotation.end)}`;

  return createPortal(
    <div
      ref={elRef}
      className="fixed z-[9999] max-w-[240px] rounded-lg bg-neutral text-neutral-content text-xs shadow-xl px-3 py-2 pointer-events-none transition-opacity duration-150 ease-out"
      style={{ top, left, opacity: ready ? 1 : 0 }}
    >
      {/* Time (always shown) */}
      <div className="font-semibold text-neutral-content/90">{timeLabel}</div>

      {/* Tags (only shown if any exist) */}
      {annotation.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {annotation.tags.map((tag) => (
            <span
              key={tag}
              className="badge badge-xs bg-white/15 border-none text-neutral-content px-2"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Comment (only shown if one was written) */}
      {annotation.comment && (
        <p className="mt-1 text-neutral-content/80 leading-snug">
          {annotation.comment}
        </p>
      )}
    </div>,
    document.body
  );
});

AnnotationTooltip.displayName = "AnnotationTooltip";
