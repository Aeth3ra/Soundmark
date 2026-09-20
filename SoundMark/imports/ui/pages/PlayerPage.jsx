import { useParams, useNavigate, useLocation } from "react-router-dom";
import { PlayerControls } from "../components/PlayerControls";
import { AudioExportButton } from "../components/AudioExportButton";
import { RegionExportButton } from "../components/RegionExportButton";
import { ProjectPackageExportButton } from "../components/ProjectPackageExportButton";
import { AnnotationForm } from "../components/annotations/AnnotationForm";
import { EffectForm } from "../components/effects/EffectForm";
import { EffectList } from "../components/effects/EffectList";
import { useEffect, useState, useRef, useMemo } from "react";
import { useTracker, useSubscribe } from "meteor/react-meteor-data";
import { AnnotationsCollection } from "../../api/annotations/annotationsCollection";
import { EffectsCollection } from "../../api/effects/effectsCollection";
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
import { WaveformDisplay } from "../components/waveform/WaveformDisplay";
import { useWaveformSync } from "../hooks/useWaveformSync";
import { SyncStatusToggle } from "../components/SyncStatusToggle";
import { ToastError } from "../components/ToastError";

export const PlayerPage = () => {
  const { fileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [copied, setCopied] = useState(null);
  const [audioSource, setAudioSource] = useState(null);
  const audioUrl = audioSource?.fileId === fileId ? audioSource.url : null;
  const [audioMissing, setAudioMissing] = useState(false);
  const [isAnnotateListOpen, setIsAnnotateListOpen] = useState(false);
  const [isEffectsListOpen, setIsEffectsListOpen] = useState(false);
  const [effectRegion, setEffectRegion] = useState(null);
  const { trigger, openAnnotation, closeAnnotation } = useAnnotationTrigger();
  const [hiddenAnnotationIds, setHiddenAnnotationIds] = useState(new Set());
  const [selectedTags, setSelectedTags] = useState([]);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [followingUserId, setFollowingUserId] = useState(null);

  // A form opened for one file must not carry over to another file.
  useEffect(() => {
    setEffectRegion(null);
    setIsEffectsListOpen(false);
  }, [fileId]);

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
    let cancelled = false;
    setAudioMissing(false);
    async function loadAudio() {
      if (!fileId) {
        navigate("/");
        return;
      }

      try {
        const url = await getPlayableUrl(fileId);
        if (!cancelled) setAudioSource({ fileId, url });
      } catch (err) {
        if (!cancelled) setAudioMissing(true);
      }
    }

    loadAudio();
    return () => { cancelled = true; };
  }, [fileId, navigate]);

  // Effects must be available before preparing the playback preview.
  const isEffectsLoading = useSubscribe("effects.forFile", fileId);
  const effects = useTracker(() => {
    return EffectsCollection.find(
      { fileId },
      { sort: { order: 1, createdAt: 1, _id: 1 } }
    ).fetch();
  }, [fileId]);
  const nextEffectOrder = effects.reduce(
    (next, effect) => Math.max(next, effect.order + 1),
    0
  );

  // Load wavesurfer
  const {
    containerRef,
    isPlaying,
    isLooping,
    playbackRate,
    currentTime,
    duration,
    zoom,
    play,
    pause,
    playPause,
    seekTo,
    setVolume,
    setZoom,
    setPlaybackRate,
    toggleLoop,
    wavesurferInstance,
    isProcessing,
    isAudioReady,
    audioError,
    audioVersion,
    retryAudio
  } = useWavesurfer(audioUrl, effects, !isEffectsLoading());

  // Load regions plugin for wavesurfer
  const regionsPlugin = useRegionsPlugin(wavesurferInstance);
  const { activeRegion, clearRegion } = useRegionSelection(regionsPlugin);
  const regionAnalysis = useRegionAnalysis(wavesurferInstance, activeRegion, audioVersion);

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
    isAnnotateListOpen,
    audioVersion
  );

  // Subscribes to the display names of everyone who has authored an
  // annotation here, so cards can show "who made this" without storing
  // the name on the annotation itself.
  const isAuthorsLoading = useSubscribe("annotations.authorsForFile", fileId);

  //Get presences of other users
  const { others: otherUsers } = usePresence({
    fileId,
    identity,
    position: currentTime,
    playbackRate,
    isPlaying,
    followingUserId
  });

  //For playhead sync
  const { targetUser, syncError, clearSyncError, stopFollowing, toggleFollow } =
    useWaveformSync({
      duration,
      otherUsers,
      currentUserId: identity?.userId,
      followingUserId,
      setFollowingUserId,
      currentTime,
      seekTo,
      play,
      pause,
      isPlaying,
      playbackRate,
      setPlaybackRate
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
    if (duration > 0) seekTo(seconds / duration);
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
              {isProcessing && (
                <p role="status" className="px-6 py-2 text-sm text-base-content/60">
                  Updating audio preview…
                </p>
              )}
              {audioError && (
                <div role="alert" className="alert alert-error mx-6 my-2">
                  <span>{audioError}</span>
                  <button type="button" onClick={retryAudio} className="btn btn-sm">
                    Retry
                  </button>
                </div>
              )}
              {/* Toolbar  */}
              <div className="flex items-center gap-6 px-6 py-3 border-b border-base-300 bg-base-100">
                <PlayerControls
                  key={fileId}
                  disabled={!isAudioReady}
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
                <SyncStatusToggle
                  targetUser={targetUser}
                  onUnlock={stopFollowing}
                />
                <AudioExportButton fileId={fileId} />
                <ProjectPackageExportButton
                  fileId={fileId}
                  annotations={annotations}
                />

                <button
                  onClick={() => {
                    setIsAnnotateListOpen((open) => !open);
                    setIsEffectsListOpen(false);
                  }}
                  className={`btn btn-sm gap-2 ${isAnnotateListOpen ? "btn-primary" : "btn-outline"}`}
                >
                  <ListMusic className="h-4 w-4" />
                  Annotations
                  {annotations.length > 0 && (
                    <span className="badge badge-sm">{annotations.length}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEffectsListOpen((open) => !open);
                    setIsAnnotateListOpen(false);
                  }}
                  className={`btn btn-sm gap-2 ${isEffectsListOpen ? "btn-primary" : "btn-outline"}`}
                >
                  Effects
                  {effects.length > 0 && (
                    <span className="badge badge-sm">{effects.length}</span>
                  )}
                </button>
              </div>

              {/* Waveform  */}
              <div aria-busy={isProcessing} className={`flex-1 px-6 py-6 ${!isAudioReady ? "pointer-events-none" : ""}`}>
                <div className="bg-base-100 rounded-box shadow-xl p-6 flex flex-col">
                  <div className="bg-base-200/40 rounded-box flex-1 p-4">
                    <WaveformDisplay
                      containerRef={containerRef}
                      wavesurferInstance={wavesurferInstance}
                      duration={duration}
                      otherUsers={otherUsers}
                      followingUserId={followingUserId}
                      onToggleLock={toggleFollow}
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
                    setEffectRegion(null);
                    setEditingAnnotation(null);
                    openAnnotation(
                      activeRegion
                        ? {
                            startMs: activeRegion.start * 1000,
                            endMs: activeRegion.end * 1000
                          }
                        : {
                            startMs: currentTime * 1000,
                            endMs: null
                          }
                    );
                  }}
                  className="btn btn-sm btn-outline gap-2"
                >
                  Create annotation
                </button>

                <button
                  type="button"
                  disabled={!activeRegion || !userId || duration <= 0 || isEffectsLoading() || !isAudioReady || Boolean(effectRegion)}
                  onClick={() => {
                    if (!activeRegion) return;
                    closeAnnotation();
                    setEditingAnnotation(null);
                    // Copy the times so changes to the selection do not move this form's target.
                    setEffectRegion({ fileId, start: activeRegion.start, end: activeRegion.end });
                    setIsEffectsListOpen(true);
                    setIsAnnotateListOpen(false);
                  }}
                  className="btn btn-sm btn-outline"
                >
                  Apply effect
                </button>

                <button
                  onClick={clearRegion}
                  disabled={!activeRegion}
                  className="btn btn-sm btn-outline gap-2"
                >
                  Clear region
                </button>

                <RegionExportButton
                  fileId={fileId}
                  activeRegion={activeRegion}
                  effects={effects}
                  isEffectsLoading={isEffectsLoading()}
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
          onEdit={(annotation) => {
            setEffectRegion(null);
            setEditingAnnotation(annotation);
          }}
          analyses={annotationAnalyses}
        />

        <EffectList
          effects={effects}
          isOpen={isEffectsListOpen}
          isLoading={isEffectsLoading()}
          onClose={() => setIsEffectsListOpen(false)}
          onSeek={handleSeekToAnnotation}
          userId={userId}
          isHost={isHost}
        />
      </div>

      {effectRegion?.fileId === fileId && (
        <EffectForm
          fileId={fileId}
          region={effectRegion}
          duration={duration}
          order={nextEffectOrder}
          onClose={() => setEffectRegion(null)}
        />
      )}

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

      {/* Render the generic toast at the bottom of the page */}
      <ToastError
        message={syncError}
        onClose={clearSyncError}
        autoDismissMs={5000}
      />
    </div>
  );
};
