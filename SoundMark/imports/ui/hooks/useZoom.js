import { useEffect } from "react";
import ZoomPlugin from "wavesurfer.js/dist/plugins/zoom.esm.js";

/**
 * Registers the WaveSurfer Zoom plugin.
 *
 * @param {WaveSurfer|null} wavesurferInstance
 */
export const useZoomPlugin = (wavesurferInstance) => {
  useEffect(() => {
    if (!wavesurferInstance) return;

    const plugin = wavesurferInstance.registerPlugin(
      ZoomPlugin.create({
        scale: 0.5,
        maxZoom: 1000
      })
    );

    return () => {
      plugin.destroy();
    };
  }, [wavesurferInstance]);
};