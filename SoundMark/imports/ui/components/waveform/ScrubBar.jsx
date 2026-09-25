import { useEffect, useRef, useState } from "react";
import { useWaveformWidth } from "../../hooks/useWaveformWidth";

const clamp01 = (n) => Math.min(1, Math.max(0, n));

const useScrollState = (wavesurferInstance, scrollWidth) => {
	const [scrollState, setScrollState] = useState({
		scrollLeft: 0,
		clientWidth: 0
	});

	useEffect(() => {
		if (!wavesurferInstance) return;

		const updateScroll = () => {
			setScrollState({
				scrollLeft: wavesurferInstance.getScroll?.() ?? 0,
				clientWidth: wavesurferInstance.getWidth?.() ?? 0
			});
		};

		wavesurferInstance.on("scroll", updateScroll);
		updateScroll();

		return () => {
			wavesurferInstance.un("scroll", updateScroll);
		};
	}, [wavesurferInstance, scrollWidth]); // re-run when scrollWidth changes (zoom/redraw) too

	return scrollState;
};

const ZoomRuler = ({
	duration,
	currentTime,
	seekTo,
	disabled,
	visibleStart,
	visibleDuration
}) => {
	const trackRef = useRef(null);

	const seekFromEvent = (e) => {
		if (!trackRef.current || duration <= 0 || visibleDuration <= 0) return;
		const rect = trackRef.current.getBoundingClientRect();
		const fraction = clamp01((e.clientX - rect.left) / rect.width);
		const visibleTime = visibleStart + fraction * visibleDuration;
		seekTo(clamp01(visibleTime / duration));
	};

	const handlePointerDown = (e) => {
		if (disabled) return;
		seekFromEvent(e);
		const handleMove = (moveEvent) => seekFromEvent(moveEvent);
		const handleUp = () => {
			window.removeEventListener("pointermove", handleMove);
			window.removeEventListener("pointerup", handleUp);
		};
		window.addEventListener("pointermove", handleMove);
		window.addEventListener("pointerup", handleUp);
	};

	const inView =
		visibleDuration > 0 &&
		currentTime >= visibleStart &&
		currentTime <= visibleStart + visibleDuration;
	const playheadPct = inView
		? ((currentTime - visibleStart) / visibleDuration) * 100
		: null;

	return (
		<div
			ref={trackRef}
			onPointerDown={handlePointerDown}
			className="relative h-3 w-full cursor-pointer rounded-full bg-base-300"
		>
			{playheadPct !== null && (
				<>
					<div
						className="absolute inset-y-0 left-0 rounded-full bg-primary/60 pointer-events-none"
						style={{ width: `${playheadPct}%` }}
					/>
					<div
						className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary shadow pointer-events-none"
						style={{ left: `${playheadPct}%` }}
					/>
				</>
			)}
		</div>
	);
};

export const ScrubBar = ({
	duration,
	currentTime,
	seekTo,
	disabled,
	wavesurferInstance
}) => {
	const scrollWidth = useWaveformWidth(wavesurferInstance);
	const { scrollLeft, clientWidth } = useScrollState(
		wavesurferInstance,
		scrollWidth
	);

	const visibleStart =
		scrollWidth > 0 ? (scrollLeft / scrollWidth) * duration : 0;
	const visibleDuration =
		scrollWidth > 0 ? (clientWidth / scrollWidth) * duration : duration;

	return (
		<div className="flex w-full flex-col gap-1">
			<ZoomRuler
				duration={duration}
				currentTime={currentTime}
				seekTo={seekTo}
				disabled={disabled}
				visibleStart={visibleStart}
				visibleDuration={visibleDuration}
			/>
		</div>
	);
};
