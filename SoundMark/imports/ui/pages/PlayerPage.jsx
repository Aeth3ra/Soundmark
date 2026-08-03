import { useLocation, useNavigate } from "react-router-dom";
import { WaveformDisplay } from "../components/WaveformDisplay";
import { PlayerControls } from "../components/PlayerControls";
import { useEffect, useState } from "react";
import { useWavesurfer } from "../hooks/useWaveSurfer";
import { getPlayableUrl } from "../services/audioService";
import { ChevronLeft } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-base-300 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="btn btn-ghost btn-sm mb-6 gap=2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {/* Main Audio Player */}
        <div className="bg-base-100 rounded-box shadow-xl p-8">
          {!audioUrl ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-base-content/60 text-sm">Loading audio...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <PlayerControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onPlayPause={playPause}
                onVolumeChange={setVolume}
              />
              <div className="bg-base-200/40 rounded-box p-4">
                <WaveformDisplay containerRef={containerRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
