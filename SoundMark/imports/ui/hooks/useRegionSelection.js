import {useEffect, useState, useCallback} from "react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js"

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
            color: "rgba(135, 135, 221, 0.4)",
        });

        const handleCreated = (region) => {
            // only one selection region at a time, remove previous regions
            regionsPlugin.getRegions().forEach((r) => {
                if (r.id !== region.id) r.remove();
            });
            setActiveRegion({ id: region.id, start: region.start, end: region.end});
        }

        const handleUpdated = (region) => {
            setActiveRegion({ id: region.id, start: region.start, end: region.end})
        };

        regionsPlugin.on("region-created", handleCreated)
        regionsPlugin.on("region-updated", handleUpdated)

        return () => {
            regionsPlugin.un("region-created", handleCreated)
            regionsPlugin.un("region-updated", handleUpdated)
        }
    }, [regionsPlugin]);

    const clearRegion = useCallback(() => {
        if (!regionsPlugin) return;
        regionsPlugin.clearRegions();
        setActiveRegion(null);
    }, [regionsPlugin]);

    return { activeRegion, clearRegion };
};