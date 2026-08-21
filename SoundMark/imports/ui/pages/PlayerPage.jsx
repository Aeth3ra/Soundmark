import { useParams, useNavigate, useLocation } from "react-router-dom";
import { WaveformDisplay } from "../components/WaveformDisplay";
import { PlayerControls } from "../components/PlayerControls";
import { AudioExportButton } from "../components/AudioExportButton";
import { AnnotationForm } from "../components/annotations/AnnotationForm";
import { useEffect, useState, useRef } from "react";
import { useTracker, useSubscribe } from "meteor/react-meteor-data";
import { AnnotationsCollection } from "../../api/annotations/annotationsCollection";
import { useAnnotationRender } from "../hooks/useAnnotationRender";
import { useAnnotationTrigger } from "../hooks/useAnnotationTrigger";
import { useRegionsPlugin } from "../hooks/useRegions";
import { useWavesurfer } from "../hooks/useWaveSurfer";
import { getPlayableUrl, deleteFile } from "../services/audioService";
import { ChevronLeft, Link2, Check, ListMusic } from "lucide-react";
import { AnnotationList } from "../components/annotations/AnnotationList";
import { AnnotationTooltip } from "../components/annotations/AnnotationToolTip";
import { AnnotationMarkersLayer } from "../components/annotations/AnnotationMarkersLayer";

export const PlayerPage = () => {
  const { fileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAnnotateListOpen, setIsAnnotateListOpen] = useState(false);
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
  }, [fileId]);
  // Load wavesurfer
  const {
    containerRef,
    isPlaying,
    isLooping,
    playbackRate,
    currentTime,
    duration,
    playPause,
    setVolume,
    setZoom,
    setPlaybackRate,
    toggleLoop,
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

  // Renders the annotations
  const tooltipRef = useRef(null);
  const markerSlots = useAnnotationRender(regionsPlugin, annotations);

  // Copies the current link into the clipboard
  const handleShare = async () => {
    const url = `${window.location.origin}${location.pathname}${location.search}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Seeks the waveform to a given time (seconds) when an annotation is clicked
  const handleSeekToAnnotation = (seconds) => {
    if (!wavesurferInstance) return;
    wavesurferInstance.setTime(seconds);
  };

  return (
    <div className="h-screen flex flex-col bg-base-300">
      {/* Top header: logo + back/share */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-base-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="btn btn-ghost btn-sm gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <div className="w-px h-5 bg-base-300 mx-1" />
          <img src="/icon-512.png" alt="SoundMark logo" className="h-6 w-6" />
          <span className="text-lg font-bold">Soundmark</span>
        </div>

        <button onClick={handleShare} className="btn btn-outline btn-sm gap-2">
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
      </header>

      {/* Main area: player (left) + annotations sidebar  */}
      <div className="flex-1 flex overflow-hidden">
        {/* Player column */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {!audioUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-base-content/60 text-sm">Loading audio...</p>
            </div>
          ) : (
            <>
              {/* Toolbar  */}
              <div className="flex items-center gap-6 px-6 py-3 border-b border-base-300 bg-base-100">
                <PlayerControls
                  isPlaying={isPlaying}
                  isLooping={isLooping}
                  playbackRate={playbackRate}
                  currentTime={currentTime}
                  duration={duration}
                  onPlayPause={playPause}
                  onToggleLoop={toggleLoop}
                  onPlaybackRateChange={setPlaybackRate}
                  onVolumeChange={setVolume}
                  onZoomChange={setZoom}
                />

                <div className="flex-1" />

                <AudioExportButton fileId={fileId} />

                <button
                  onClick={() => setIsAnnotateListOpen((open) => !open)}
                  className={`btn btn-sm gap-2 ${isAnnotateListOpen ? "btn-primary" : "btn-outline"}`}
                >
                  <ListMusic className="h-4 w-4" />
                  Annotations
                  {annotations.length > 0 && (
                    <span className="badge badge-sm">{annotations.length}</span>
                  )}
                </button>
              </div>

              {/* Waveform  */}
              <div className="flex-1 px-6 py-6">
                <div className="bg-base-100 rounded-box shadow-xl p-6 flex flex-col">
                  <div className="bg-base-200/40 rounded-box flex-1 p-4">
                    <WaveformDisplay containerRef={containerRef} />
                  </div>
                </div>
              </div>

              {/* TEMPORARY: fakes a region trigger so AnnotationForm
                  can be tested */}
              <button
                onClick={() => openAnnotation({ startMs: 4200, endMs: 20000 })}
                className="btn btn-xs btn-outline gap-2 self-start ml-6 mb-4"
              >
                DEV: fake region trigger
              </button>
              <button
                onClick={() => openAnnotation({ startMs: 1000 })}
                className="btn btn-xs btn-outline gap-2 self-start ml-6 mb-4"
              >
                DEV: fake region trigger
              </button>
            </>
          )}
        </div>

        {/* Annotations sidebar */}
        <AnnotationList
          annotations={annotations}
          isOpen={isAnnotateListOpen}
          onClose={() => setIsAnnotateListOpen(false)}
          onSeek={handleSeekToAnnotation}
        />
      </div>

      {/* Annotation form - only appears if triggered */}
      <AnnotationForm
        trigger={trigger}
        fileId={fileId}
        createdBy={sessionStorage.getItem("soundmark_guest_name") || "Guest"} // not implemented yet
        onClose={closeAnnotation}
      />

      {/* Annotation Marker on top of the annotation regions/timestamps */}
      <AnnotationMarkersLayer
        markerSlots={markerSlots}
        tooltipRef={tooltipRef}
      />

      {/* Annotation tool tip upon hover */}
      <AnnotationTooltip ref={tooltipRef} />
    </div>
  );
};
