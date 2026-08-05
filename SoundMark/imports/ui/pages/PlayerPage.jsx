import { useParams, useNavigate, useLocation } from "react-router-dom";
import { WaveformDisplay } from "../components/WaveformDisplay";
import { PlayerControls } from "../components/PlayerControls";
import { useEffect, useState } from "react";
import { useWavesurfer } from "../hooks/useWaveSurfer";
import { getPlayableUrl, deleteFile } from "../services/audioService";
import { ChevronLeft, Link2, Check } from "lucide-react";

export const PlayerPage = () => {
  const { fileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // Load Audio
  useEffect(() => {
    async function loadAudio() {
      if (!fileId) {
        navigate("/");
        return;
      }

      const url = await getPlayableUrl(fileId);
      setAudioUrl(url);
    }

    loadAudio();
  }, [fileId, navigate]);

  //Clean Up Audio (Closing/Back button)
  useEffect(() => {
    return () => {
      if (fileId) {
        deleteFile(fileId);
      }
    };
  }, [location.state]);

  // Copies the current link into the clipboard
  const handleShare = async () => {
    const url = `${window.location.origin}${location.pathname}${location.search}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load wavesurfer
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
        <div className="flex items-center justify-between mb-6">
          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {/* Share button */}
          <button
            onClick={handleShare}
            className="btn btn-outline btn-sm gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Share session
              </>
            )}
          </button>
        </div>

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
