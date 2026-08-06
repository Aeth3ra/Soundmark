import { useParams, useNavigate, useLocation } from "react-router-dom";
import { WaveformDisplay } from "../components/WaveformDisplay";
import { PlayerControls } from "../components/PlayerControls";
import { AudioExportButton } from "../components/AudioExportButton";
import { AnnotationForm } from "../components/AnnotationForm";
import { useEffect, useState } from "react";
import { useTracker, useSubscribe } from "meteor/react-meteor-data";
import { AnnotationsCollection } from "../../api/annotations/annotationsCollection";
import { useAnnotationRender } from "../hooks/useAnnotationRender";
import { useAnnotationTrigger } from "../hooks/useAnnotationTrigger";
import { useRegionsPlugin } from "../hooks/useRegions";
import { useWavesurfer } from "../hooks/useWaveSurfer";
import { getPlayableUrl, deleteFile } from "../services/audioService";
import { ChevronLeft, Link2, Check } from "lucide-react";

export const PlayerPage = () => {
  const { fileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const { trigger, openAnnotation, closeAnnotation } = useAnnotationTrigger();

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
    setVolume,
    wavesurferInstance
  } = useWavesurfer(audioUrl);

  // Load regions plugin for wavesurfer
  const regionsPlugin = useRegionsPlugin(wavesurferInstance);

  // Subscribes to annotation collection for the current file
  const isAnnotationsLoading = useSubscribe("annotations.forFile", fileId);
  const annotations = useTracker(() => {
    return AnnotationsCollection.find(
      { fileId },
      { sort: { start: 1 } }
    ).fetch();
  }, [fileId]);
  console.log(annotations);
  // Renders the annotations
  useAnnotationRender(regionsPlugin, annotations);

  return (
    <div className="min-h-screen bg-base-300 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        {/*Logo */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/icon-512.png" alt="SoundMark logo" className="h-7 w-7" />
          <span className="text-xl font-bold">Soundmark</span>
        </div>

        {/* Action buttons */}
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
              <div className="flex justify-end">
                <AudioExportButton fileId={fileId} />
              </div>

              {/* TEMPORARY: fakes a region trigger so AnnotationForm
                  can be tested */}
              <button
                onClick={() => openAnnotation({ startMs: 4200, endMs: 7800 })}
                className="btn btn-xs btn-outline gap-2 self-start"
              >
                DEV: fake region trigger
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Annotation form - only appears if triggered */}
      <AnnotationForm
        trigger={trigger}
        fileId={fileId}
        createdBy={sessionStorage.getItem("soundmark_guest_name") || "Guest"} // not implemented yet
        onClose={closeAnnotation}
      />
    </div>
  );
};
