import { useEffect, useState, useCallback } from "react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";

const SELECTION_PREFIX = "annotation-";

/**
 * Enables click-and-drag region selection and tracks the active
 * region's start/end times.
 *
 * @param {RegionsPlugin|null} regionsPlugin - from useRegionsPlugin
 * @returns {{ activeRegion: {start:number,end:number}|null, clearRegion: Function }}
 */
export const useRegionSelection = (regionsPlugin) => {
  const [activeRegion, setActiveRegion] = useState(null);

  useEffect(() => {
    if (!regionsPlugin) return;

    regionsPlugin.enableDragSelection({
      color: "rgba(135, 135, 221, 0.4)"
    });

    const handleCreated = (region) => {
      if (region.id.startsWith(SELECTION_PREFIX)) return;
      // only one selection region at a time, remove previous regions
      regionsPlugin.getRegions().forEach((r) => {
        if (r.id !== region.id && !r.id.startsWith(SELECTION_PREFIX)) {
          r.remove();
        }
      });

      // Bring the new selection above any overlapping annotation regions
      region.element?.style.setProperty("z-index", "10");

      setActiveRegion({ id: region.id, start: region.start, end: region.end });
    };

    const handleUpdated = (region) => {
      if (region.id.startsWith(SELECTION_PREFIX)) return;
      setActiveRegion({ id: region.id, start: region.start, end: region.end });
    };

    regionsPlugin.on("region-created", handleCreated);
    regionsPlugin.on("region-updated", handleUpdated);

    return () => {
      regionsPlugin.un("region-created", handleCreated);
      regionsPlugin.un("region-updated", handleUpdated);
    };
  }, [regionsPlugin]);

  const clearRegion = useCallback(() => {
    if (!regionsPlugin) return;
    regionsPlugin.getRegions().forEach((r) => {
      if (!r.id.startsWith(SELECTION_PREFIX)) {
        r.remove();
      }
    });
    setActiveRegion(null);
  }, [regionsPlugin]);

  return { activeRegion, clearRegion };
};
