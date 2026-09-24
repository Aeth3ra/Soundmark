import { useRef, useState } from "react";
import { createPortal } from "react-dom";

// One color per effect type - matches EFFECT_HANDLERS keys. Extend as you
// add handlers. Falls back to a neutral grey for anything unrecognized so
// a new handler type doesn't break styling before this map is updated.
const TYPE_COLORS = {
	normalize: "bg-emerald-500",
	amplify: "bg-amber-500",
	pitchShift: "bg-rose-500",
	filter: "bg-sky-500"
};

const TYPE_LABELS = {
	normalize: "Normalize",
	amplify: "Amplify",
	pitchShift: "Pitch shift",
	filter: "Filter"
};

function colorForType(type) {
	return TYPE_COLORS[type] ?? "bg-base-content/40";
}

function labelForType(type) {
	return TYPE_LABELS[type] ?? type;
}

/**
 * A single effect band - self-contained, like UserPlayhead.
 *
 * The hover tooltip is rendered via a portal to document.body, positioned
 * with getBoundingClientRect(), rather than as a normal absolutely
 * positioned child - the lane sits inside overflow-hidden/overflow-y-auto
 * containers (for the capped-height + distinct-panel styling), which would
 * otherwise silently clip the tooltip.
 *
 * @param slot - one entry from useEffectsRender's bandSlots:
 *   { id, effect, left, width, top, isActive }
 */
export const EffectBand = ({ slot }) => {
	const [tooltipPos, setTooltipPos] = useState(null);
	const bandRef = useRef(null);
	const { effect, left, width, top, isActive } = slot;

	const showTooltip = () => {
		const rect = bandRef.current?.getBoundingClientRect();
		if (rect) {
			setTooltipPos({ x: rect.left, y: rect.bottom + 4 });
		}
	};
	const hideTooltip = () => setTooltipPos(null);

	return (
		<>
			<div
				ref={bandRef}
				onMouseEnter={showTooltip}
				onMouseLeave={hideTooltip}
				className={`
					absolute rounded-sm text-[10px] leading-none text-white px-1
					flex items-center overflow-hidden whitespace-nowrap
					transition-shadow cursor-default
					${colorForType(effect.type)}
					${effect.enabled ? "opacity-90" : "opacity-40 [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.25)_3px,rgba(0,0,0,0.25)_6px)]"}
					${isActive ? "ring-2 ring-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" : ""}
				`}
				style={{ left, width, top, height: 16 }}
				title={`${labelForType(effect.type)}${effect.enabled ? "" : " (disabled)"}`}
			>
				{width > 24 ? labelForType(effect.type) : ""}
			</div>

			{tooltipPos &&
				createPortal(
					<div
						className="fixed z-50 bg-neutral text-neutral-content text-xs rounded-box px-2 py-1 shadow-xl pointer-events-none whitespace-normal"
						style={{ left: tooltipPos.x, top: tooltipPos.y }}
					>
						<div className="font-semibold">
							{labelForType(effect.type)}
						</div>
						{Object.entries(effect.params ?? {}).map(
							([key, value]) => (
								<div key={key} className="opacity-80">
									{key}: {String(value)}
								</div>
							)
						)}
					</div>,
					document.body
				)}
		</>
	);
};
