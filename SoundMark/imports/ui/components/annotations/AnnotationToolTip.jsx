import {
	forwardRef,
	useImperativeHandle,
	useState,
	useRef,
	useLayoutEffect
} from "react";
import { createPortal } from "react-dom";
import { formatTime } from "../../utils/time";

const MARGIN = 8;

/**
 * Tooltip that appears upon hovering annotation marker
 */
export const AnnotationTooltip = forwardRef(({ userNames = {} }, ref) => {
	const [content, setContent] = useState(null); // { annotation, isTimestamp } | null
	const [pos, setPos] = useState(null); // { top, left } | null - null while unmeasured

	const targetElRef = useRef(null);
	const tooltipRef = useRef(null);

	useImperativeHandle(ref, () => ({
		show(targetEl, annotation, isTimestamp) {
			targetElRef.current = targetEl;
			setPos(null); // force a remeasure on the next layout pass
			setContent({ annotation, isTimestamp });
		},
		hide() {
			setContent(null);
		}
	}));

	// Measure after the tooltip has rendered (so its real size is known),
	// then position it - runs once per show(), since pos starts null.
	useLayoutEffect(() => {
		if (!content || pos || !tooltipRef.current || !targetElRef.current)
			return;

		const targetRect = targetElRef.current.getBoundingClientRect();
		const tooltipRect = tooltipRef.current.getBoundingClientRect();

		const left = Math.max(
			MARGIN,
			Math.min(
				targetRect.left + targetRect.width / 2 - tooltipRect.width / 2,
				window.innerWidth - tooltipRect.width - MARGIN
			)
		);
		const top = Math.max(MARGIN, targetRect.top - tooltipRect.height - 10);

		setPos({ top, left });
	}, [content, pos]);

	if (!content) return null;

	const { annotation, isTimestamp } = content;
	const timeLabel = isTimestamp
		? formatTime(annotation.start)
		: `${formatTime(annotation.start)} - ${formatTime(annotation.end)}`;

	return createPortal(
		<div
			ref={tooltipRef}
			className="fixed z-[9999] max-w-[240px] rounded-lg bg-neutral text-neutral-content text-xs shadow-xl px-3 py-2 pointer-events-none transition-opacity duration-150 ease-out"
			style={{
				top: pos?.top ?? 0,
				left: pos?.left ?? 0,
				opacity: pos ? 1 : 0,
				visibility: pos ? "visible" : "hidden"
			}}
		>
			{annotation.title && (
				<p className="mb-0.5 font-semibold break-words">
					{annotation.title}
				</p>
			)}

			<div className="flex items-center justify-between gap-2">
				<span
					className={
						annotation.title
							? "text-neutral-content/60"
							: "font-semibold text-neutral-content/90"
					}
				>
					{timeLabel}
				</span>
				{annotation.createdBy && (
					<span className="text-neutral-content/60 text-[10px]">
						{userNames[annotation.createdBy] ?? "Unknown"}
					</span>
				)}
			</div>

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

			{annotation.comment && (
				<p className="mt-1 text-neutral-content/80 leading-snug break-words">
					{annotation.comment}
				</p>
			)}
		</div>,
		document.body
	);
});

AnnotationTooltip.displayName = "AnnotationTooltip";
