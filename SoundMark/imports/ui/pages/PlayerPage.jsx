import { useLocation, useNavigate } from "react-router-dom";
import { WaveformDisplay } from "../components/WaveformDisplay";
import { PlayerControls } from "../components/PlayerControls";
import { useEffect } from "react";
import { useWavesurfer } from "../hooks/useWaveSurfer";

export const PlayerPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const file = state?.file;

  useEffect(() => {
    if (!file) navigate("/");
  }, [file, navigate]);

  const {
    containerRef,
    isPlaying,
    currentTime,
    duration,
    playPause,
    setVolume
  } = useWavesurfer(file);

  return (
    <div>
      <WaveformDisplay containerRef={containerRef} />

      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={playPause}
        onVolumeChange={setVolume}
      />
    </div>
  );
};
