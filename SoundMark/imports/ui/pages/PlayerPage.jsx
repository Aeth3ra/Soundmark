import { useParams, useNavigate, useLocation } from "react-router-dom";
import { WaveformDisplay } from "../components/WaveformDisplay";
import { PlayerControls } from "../components/PlayerControls";
import { AudioExportButton } from "../components/AudioExportButton";
import { RegionExportButton } from "../components/RegionExportButton";
import { AnnotationForm } from "../components/annotations/AnnotationForm";
import { useEffect, useState, useRef, useMemo } from "react";
import { useTracker, useSubscribe } from "meteor/react-meteor-data";
import { AnnotationsCollection } from "../../api/annotations/annotationsCollection";
import { useAnnotationRender } from "../hooks/useAnnotationRender";
import { useAnnotationTrigger } from "../hooks/useAnnotationTrigger";
import { useRegionsPlugin } from "../hooks/useRegions";
import { useRegionSelection } from "../hooks/useRegionSelection";
import { useRegionAnalysis } from "../hooks/useRegionAnalysis";
import { useAnnotationAnalysis } from "../hooks/useAnnotationAnalysis";
import { useZoomPlugin } from "../hooks/useZoom";
import { useWavesurfer } from "../hooks/useWaveSurfer";
import { getPlayableUrl } from "../services/audioService";
import { ChevronLeft, Link2, Check, ListMusic, Crown } from "lucide-react";
import { AnnotationList } from "../components/annotations/AnnotationList";
import { AnnotationTooltip } from "../components/annotations/AnnotationToolTip";
import { AnnotationMarkersLayer } from "../components/annotations/AnnotationMarkersLayer";
import { RegionSelectionDisplay } from "../components/RegionSelectionDisplay";
import { useGuestAccount } from "../hooks/useGuestAccount";
import { usePresence } from "../hooks/usePresence";
import { colourForId } from "../lib/userColour";
import { WorkspaceUsers } from "../components/WorkspaceUser";
import { useUserNames } from "../hooks/useUsernames";
import { useSession } from "../hooks/useSession";

export const PlayerPage = () => {
  const { fileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioMissing, setAudioMissing] = useState(false);
  const [isAnnotateListOpen, setIsAnnotateListOpen] = useState(false);
  const { trigger, openAnnotation, closeAnnotation } = useAnnotationTrigger();
  const [hiddenAnnotationIds, setHiddenAnnotationIds] = useState(new Set());
  const [selectedTags, setSelectedTags] = useState([]);
  const [editingAnnotation, setEditingAnnotation] = useState(null);

  // Tags currently used to filter the annotation list
  const toggleTagFilter = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };
  const clearTagFilters = () => setSelectedTags([]);

  // Annotations hidden from the waveform overlay (still shown, dimmed, in the list)
  const toggleAnnotationHidden = (id) => {
    setHiddenAnnotationIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Get user
  const { userId, name, isReady } = useGuestAccount();

  const identity = useMemo(
    () => ({
      userId,
      name
    }),
    [userId, name]
  );

  // Tracks who's hosting this file's session, and whether that host has
  // left (host leaving ends the session for everyone else).
  const { isHost, sessionEnded } = useSession({ fileId, userId });
  // If session has eneded, kicks out other users
  useEffect(() => {
    if (sessionEnded) {
      navigate("/", { state: { sessionEnded: true } });
    }
  }, [sessionEnded, navigate]);

  // Load Audio
  useEffect(() => {
    async function loadAudio() {
      if (!fileId) {
        navigate("/");
        return;
      }

      try {
        const url = await getPlayableUrl(fileId);
        setAudioUrl(url);
      } catch (err) {
        setAudioMissing(true);
      }
    }

    loadAudio();
  }, [fileId, navigate]);

  // Load wavesurfer
  const {
    containerRef,
    isPlaying,
    isLooping,
    playbackRate,
    currentTime,
    duration,
    zoom,
    playPause,
    setVolume,
    setZoom,
    setPlaybackRate,
    toggleLoop,
    wavesurferInstance
  } = useWavesurfer(audioUrl);

  // Load regions plugin for wavesurfer
  const regionsPlugin = useRegionsPlugin(wavesurferInstance);
  const { activeRegion, clearRegion } = useRegionSelection(regionsPlugin);
  const regionAnalysis = useRegionAnalysis(wavesurferInstance, activeRegion);

  useZoomPlugin(wavesurferInstance);

  // Subscribes to annotation collection for the current file
  const isAnnotationsLoading = useSubscribe("annotations.forFile", fileId);
  const annotations = useTracker(() => {
    return AnnotationsCollection.find(
      { fileId },
      { sort: { start: 1 } }
    ).fetch();
  }, [fileId]);
  const annotationAnalyses = useAnnotationAnalysis(
    wavesurferInstance,
    annotations,
    isAnnotateListOpen
  );

  // Subscribes to the display names of everyone who has authored an
  // annotation here, so cards can show "who made this" without storing
  // the name on the annotation itself.
  const isAuthorsLoading = useSubscribe("annotations.authorsForFile", fileId);

  //Get presences of other users
  const { others: otherUsers } = usePresence({
    fileId,
    identity,
    position: currentTime
  });

  // userId -> display name, for showing "who made this" on annotation cards
  const userNames = useUserNames({ fileId, otherUsers, userId, name });

  // Renders the annotations
  const tooltipRef = useRef(null);
  const visibleAnnotations = useMemo(() => {
    return annotations.filter((a) => !hiddenAnnotationIds.has(a._id));
  }, [annotations, hiddenAnnotationIds]);
  const markerSlots = useAnnotationRender(regionsPlugin, visibleAnnotations);

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

  // Session is over screen
  if (audioMissing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-base-300 px-6 text-center">
        <img
          src="/icon-512.png"
          alt="SoundMark logo"
          className="h-10 w-10 opacity-70"
        />
        <h1 className="text-xl font-bold">This session has ended</h1>
        <p className="text-base-content/60 text-sm max-w-sm">
          The audio for this session is no longer available. It may have been
          removed after the host ended things.
        </p>
        <button
          onClick={() => navigate("/")}
          className="btn btn-primary btn-sm"
        >
          Back to home
        </button>
      </div>
    );
  }

  // In session
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
        <div className="flex items-center gap-3">
          {/* Host indicator - only shown to the host themselves */}
          {isHost && (
            <span
              className="badge badge-primary badge-sm gap-1 py-3"
              title="Leaving will end this session for everyone"
            >
              <Crown className="h-3 w-3" />
              You're hosting
            </span>
          )}
          {/* Workspace users */}
          <WorkspaceUsers currentUser={identity} otherUsers={otherUsers} />

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
                  zoom={zoom}
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
                    <WaveformDisplay
                      containerRef={containerRef}
                      wavesurferInstance={wavesurferInstance}
                      duration={duration}
                      otherUsers={otherUsers}
                    />
                  </div>
                </div>
              </div>

              {/* Region time display */}
              <RegionSelectionDisplay
                activeRegion={activeRegion}
                analysis={regionAnalysis}
              />

              {/* Region selection actions */}
              <div className="flex items-center gap-2 self-start ml-6 mb-4">
                <button
                  onClick={() => {
                    setEditingAnnotation(null);
                    openAnnotation({
                      startMs: activeRegion.start * 1000,
                      endMs: activeRegion.end * 1000
                    })
                  }}
                  disabled={!activeRegion}
                  className="btn btn-sm btn-outline gap-2"
                >
                  Create annotation
                </button>

                <button
                  onClick={clearRegion}
                  disabled={!activeRegion}
                  className="btn btn-sm btn-outline gap-2"
                >
                  Clear region
                </button>

                <RegionExportButton
                  wavesurferInstance={wavesurferInstance}
                  activeRegion={activeRegion}
                />
              </div>
            </>
          )}
        </div>

        {/* Annotations sidebar */}
        <AnnotationList
          annotations={annotations}
          isOpen={isAnnotateListOpen}
          onClose={() => setIsAnnotateListOpen(false)}
          onSeek={handleSeekToAnnotation}
          selectedTags={selectedTags}
          onToggleTagFilter={toggleTagFilter}
          onClearFilters={clearTagFilters}
          hiddenIds={hiddenAnnotationIds}
          onToggleHidden={toggleAnnotationHidden}
          userNames={userNames}
          onEdit={setEditingAnnotation}
          analyses={annotationAnalyses}
        />
      </div>

      {/* Annotation form - only appears if triggered or editing */}
      <AnnotationForm
        trigger={trigger}
        annotation={editingAnnotation}
        fileId={fileId}
        onClose={() => {
          closeAnnotation();
          setEditingAnnotation(null);
          clearRegion();
        }}
      />

      {/* Annotation Marker on top of the annotation regions/timestamps */}
      <AnnotationMarkersLayer
        markerSlots={markerSlots}
        tooltipRef={tooltipRef}
      />

      {/* Annotation tool tip upon hover */}
      <AnnotationTooltip ref={tooltipRef} userNames={userNames} />
    </div>
  );
};
