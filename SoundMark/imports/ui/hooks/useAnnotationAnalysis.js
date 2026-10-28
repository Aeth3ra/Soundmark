import { useEffect, useRef, useState } from "react";
import { analyseRegion } from "../utils/audioAnalysis";

const cacheKeyFor = (annotation) =>
  `${annotation._id}:${annotation.start}:${annotation.end ?? "timestamp"}`;

const unavailableAnalysis = (annotation) => ({
  duration:
    annotation.end == null
      ? null
      : Math.max(0, annotation.end - annotation.start),
  bpm: null,
  pitch: null,
  key: null,
  isAnalysing: false
});

/**
 * Progressively analyses audio regions corresponding to annotations in the background,
 * caching results by annotation geometry to avoid redundant DSP computation.
 *
 * @param {object|null} wavesurferInstance - WaveSurfer instance holding decoded audio.
 * @param {Array<object>} annotations - List of annotation documents.
 * @param {boolean} enabled - Whether automatic analysis is enabled.
 * @returns {Record<string, { duration: number|null, bpm: number|null, pitch: string|null, key: string|null, isAnalysing: boolean }>}
 */
export const useAnnotationAnalysis = (
  wavesurferInstance,
  annotations,
  enabled
) => {
  const [analyses, setAnalyses] = useState({});
  const cacheRef = useRef(new Map());

  useEffect(() => {
    if (!enabled) return undefined;

    const decodedAudio = wavesurferInstance?.getDecodedData();
    const pending = [];
    const next = {};

    annotations.forEach((annotation) => {
      const cacheKey = cacheKeyFor(annotation);
      const cached = cacheRef.current.get(cacheKey);

      if (cached) {
        next[annotation._id] = cached;
      } else if (annotation.end == null) {
        const unavailable = unavailableAnalysis(annotation);
        cacheRef.current.set(cacheKey, unavailable);
        next[annotation._id] = unavailable;
      } else if (!decodedAudio) {
        next[annotation._id] = unavailableAnalysis(annotation);
      } else {
        pending.push({ annotation, cacheKey });
        next[annotation._id] = {
          ...unavailableAnalysis(annotation),
          isAnalysing: true,
          cacheKey
        };
      }
    });

    setAnalyses(next);

    let cancelled = false;
    let timeout;
    let pendingIndex = 0;

    const analyseNext = () => {
      if (cancelled || pendingIndex >= pending.length) return;

      const { annotation, cacheKey } = pending[pendingIndex];
      pendingIndex += 1;

      let result;
      try {
        result = analyseRegion(decodedAudio, annotation.start, annotation.end);
      } catch {
        result = unavailableAnalysis(annotation);
      }

      const completed = { ...result, isAnalysing: false };
      cacheRef.current.set(cacheKey, completed);
      setAnalyses((current) => {
        if (current[annotation._id]?.cacheKey !== cacheKey) return current;
        return { ...current, [annotation._id]: completed };
      });

      timeout = window.setTimeout(analyseNext, 0);
    };

    if (pending.length > 0) timeout = window.setTimeout(analyseNext, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [wavesurferInstance, annotations, enabled]);

  return analyses;
};
