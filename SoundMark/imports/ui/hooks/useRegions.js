import { useEffect, useState } from "react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";

/**
 * Registers the wavesurfer Regions plugin exactly once and returns the
 * instance.
 *
 * @param {WaveSurfer|null} wavesurferInstance - from useWaveSurfer
 * @returns {RegionsPlugin|null}
 */
export const useRegionsPlugin = (wavesurferInstance) => {
  const [regionsPlugin, setRegionsPlugin] = useState(null);

  useEffect(() => {
    if (!wavesurferInstance) return;

    const plugin = wavesurferInstance.registerPlugin(RegionsPlugin.create());
    setRegionsPlugin(plugin);

    return () => {
      plugin.destroy();
      setRegionsPlugin(null);
    };
  }, [wavesurferInstance]);

  return regionsPlugin;
};
