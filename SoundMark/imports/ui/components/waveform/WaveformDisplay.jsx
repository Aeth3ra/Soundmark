import { UserPresenceOverlay } from "./UserPresenceOverlay";

export const WaveformDisplay = ({
  containerRef,
  wavesurferInstance,
  duration,
  otherUsers = []
}) => {
  const waveformWidth = wavesurferInstance?.getWrapper()?.scrollWidth ?? 0;

  return (
    <div className="relative w-full">
      <div ref={containerRef} />

      <UserPresenceOverlay
        users={otherUsers}
        duration={duration}
        waveformWidth={waveformWidth}
      />
    </div>
  );
};
