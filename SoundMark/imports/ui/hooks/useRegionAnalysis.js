import { useEffect, useRef, useState } from "react";
import { analyseRegion } from "../utils/audioAnalysis";

const emptyAnalysis = {
  duration: null,
  bpm: null,
  pitch: null,
  key: null,
  isAnalysing: false
};

export const useRegionAnalysis = (wavesurferInstance, activeRegion) => {
  const [analysis, setAnalysis] = useState(emptyAnalysis);
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    const currentRequest = requestId.current;

    if (!activeRegion) {
      setAnalysis(emptyAnalysis);
      return undefined;
    }

    const duration = Math.max(0, activeRegion.end - activeRegion.start);
    const decodedAudio = wavesurferInstance?.getDecodedData();
    setAnalysis({
      duration,
      bpm: null,
      pitch: null,
      key: null,
      isAnalysing: Boolean(decodedAudio)
    });

    if (!decodedAudio) return undefined;

    const timeout = window.setTimeout(() => {
      try {
        const result = analyseRegion(
          decodedAudio,
          activeRegion.start,
          activeRegion.end
        );

        if (requestId.current === currentRequest) {
          setAnalysis({ ...result, isAnalysing: false });
        }
      } catch {
        if (requestId.current === currentRequest) {
          setAnalysis({
            duration,
            bpm: null,
            pitch: null,
            key: null,
            isAnalysing: false
          });
        }
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [
    wavesurferInstance,
    activeRegion?.id,
    activeRegion?.start,
    activeRegion?.end
  ]);

  return analysis;
};
