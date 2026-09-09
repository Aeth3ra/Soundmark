import { UserPresenceOverlay } from "./UserPresenceOverlay";

export const WaveformDisplay = ({
  containerRef,
  wavesurferInstance,
  duration,
  otherUsers = [],
  followingUserId,
  onToggleLock
}) => {
  const waveformWidth = wavesurferInstance?.getWrapper()?.scrollWidth ?? 0;

  return (
    <div className="relative w-full flex flex-col gap-2">
      {/* Waveform Canvas Container */}
      <div className="relative w-full">
        <div ref={containerRef} />

        <UserPresenceOverlay
          users={otherUsers}
          duration={duration}
          waveformWidth={waveformWidth}
          followingUserId={followingUserId}
          onToggleLock={onToggleLock}
        />
      </div>
    </div>
  );
};
