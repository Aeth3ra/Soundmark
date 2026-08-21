import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

export const useWavesurfer = (url) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoom, setZoomState] = useState(0);
  const [wavesurferInstance, setWavesurferInstance] = useState(null);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    // wavesurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgb(200, 0, 200)",
      progressColor: "rgb(100, 0, 100)",
    });

    wavesurferRef.current = wavesurfer;
    wavesurfer.getMediaElement().loop = false;
    setIsLooping(false);
    setPlaybackRateState(1);
    wavesurfer.load(url);

    // Information needed for player controls
    wavesurfer.on("ready", () => {
      setDuration(wavesurfer.getDuration());
      setWavesurferInstance(wavesurfer);
    });
    wavesurfer.on("audioprocess", () =>
      setCurrentTime(wavesurfer.getCurrentTime())
    );
    wavesurfer.on("seeking", () => setCurrentTime(wavesurfer.getCurrentTime()));
    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => setIsPlaying(false));
    wavesurfer.on("zoom", setZoomState);

    // set the wavesurfer instance that will be exposed
    return () => {
      wavesurfer.destroy();
      setWavesurferInstance(null);
    };
  }, [url]);

  // functions to control wavesurfer instance
  const playPause = () => wavesurferRef.current?.playPause();
  const setVolume = (value) => wavesurferRef.current?.setVolume(value);
  const setZoom = (value) => wavesurferRef.current?.zoom(value);

  const setPlaybackRate = (rate) => {
    if (!wavesurferRef.current) return;

    wavesurferRef.current.setPlaybackRate(rate, true);
    setPlaybackRateState(rate);
  };
  const toggleLoop = () => {
    const media = wavesurferRef.current?.getMediaElement();
    if (!media) return;

    media.loop = !media.loop;
    setIsLooping(media.loop);
  };

  return {
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
  };
};
