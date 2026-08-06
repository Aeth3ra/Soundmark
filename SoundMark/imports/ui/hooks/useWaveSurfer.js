import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

export const useWavesurfer = (url) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [wavesurferInstance, setWavesurferInstance] = useState(null);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    // wavesurfer instance
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgb(200, 0, 200)",
      progressColor: "rgb(100, 0, 100)"
    });

    wavesurferRef.current = wavesurfer;
    wavesurfer.load(url);

    // Information needed for player controls
    wavesurfer.on("ready", () => setDuration(wavesurfer.getDuration()));
    wavesurfer.on("audioprocess", () =>
      setCurrentTime(wavesurfer.getCurrentTime())
    );
    wavesurfer.on("seeking", () => setCurrentTime(wavesurfer.getCurrentTime()));
    wavesurfer.on("play", () => setIsPlaying(true));
    wavesurfer.on("pause", () => setIsPlaying(false));
    wavesurfer.on("finish", () => setIsPlaying(false));

    // set the wavesurfer instance that will be exposed
    setWavesurferInstance(wavesurfer);
    return () => {
      wavesurfer.destroy();
    };
  }, [url]);

  // functions to control wavesurfer instance
  const playPause = () => wavesurferRef.current?.playPause();
  const setVolume = (value) => wavesurferRef.current?.setVolume(value);

  return {
    containerRef,
    isPlaying,
    currentTime,
    duration,
    playPause,
    setVolume,
    wavesurferInstance
  };
};
