import { useLocation, useNavigate } from "react-router-dom";
import { WaveformDisplay } from "../components/WaveformDisplay";
import { PlayerControls } from "../components/PlayerControls";
import { useEffect, useState } from "react";
import { useWavesurfer } from "../hooks/useWaveSurfer";
import { getPlayableUrl } from "../services/audioService";

export const PlayerPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    async function loadAudio() {
      if (!state?.key) {
        navigate("/");
        return;
      }

      const url = await getPlayableUrl(state.key);
      setAudioUrl(url);
    }

    loadAudio();
  }, [state, navigate]);

  const {
    containerRef,
    isPlaying,
    currentTime,
    duration,
    playPause,
    setVolume
  } = useWavesurfer(audioUrl);

  if (!audioUrl) {
    return <p>Loading audio...</p>;
  }

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
