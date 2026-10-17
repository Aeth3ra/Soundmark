import { useEffect, useRef } from "react";
import { UserPresenceOverlay } from "./UserPresenceOverlay";
import { EffectLane } from "../effects/EffectLane";
import { useEffectsRender } from "../../hooks/useEffectLane";
import { useWaveformWidth } from "../../hooks/useWaveformWidth";

export const WaveformDisplay = ({
	containerRef,
	wavesurferInstance,
	duration,
	currentTime,
	effects = [],
	otherUsers = [],
	followingUserId,
	onToggleLock
}) => {
	const waveformWidth = useWaveformWidth(wavesurferInstance);
	const { bandSlots, laneHeight } = useEffectsRender(
		waveformWidth,
		effects,
		duration,
		currentTime
	);

	const laneScrollRef = useRef(null);
	const laneContentRef = useRef(null);

	useEffect(() => {
		if (!wavesurferInstance) return;

		const applySync = (scrollLeftOverride) => {
			const width = wavesurferInstance.getWrapper?.()?.scrollWidth ?? 0;
			if (laneContentRef.current) {
				laneContentRef.current.style.width = `${width}px`;
			}
			const scrollLeft =
				scrollLeftOverride ?? wavesurferInstance.getScroll?.() ?? 0;
			if (laneScrollRef.current) {
				laneScrollRef.current.scrollLeft = scrollLeft;
			}
		};

		const onScroll = (_start, _end, scrollLeft) => applySync(scrollLeft);
		const onZoom = () => applySync();

		wavesurferInstance.on("scroll", onScroll);
		wavesurferInstance.on("zoom", onZoom);
		applySync();

		return () => {
			wavesurferInstance.un("scroll", onScroll);
			wavesurferInstance.un("zoom", onZoom);
		};
	}, [wavesurferInstance]);

	const hasEffects = bandSlots.length > 0;

	return (
		<div className="relative w-full flex flex-col gap-2">
			{/* Waveform Canvas Container */}
			<div className="relative w-full">
				<div ref={containerRef} data-testid="waveform" />

				<UserPresenceOverlay
					users={otherUsers}
					duration={duration}
					waveformWidth={waveformWidth}
					followingUserId={followingUserId}
					onToggleLock={onToggleLock}
				/>
			</div>

			{/* Effects lane */}
			{hasEffects && (
				<div className="rounded-box border border-base-300 bg-base-300/30 overflow-hidden">
					<div className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
						Effects
					</div>
					<div
						ref={laneScrollRef}
						className="w-full overflow-x-hidden overflow-y-auto max-h-24 px-2 pb-2"
					>
						<div
							ref={laneContentRef}
							className="relative"
							style={{ width: waveformWidth, height: laneHeight }}
						>
							<EffectLane bandSlots={bandSlots} />
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
