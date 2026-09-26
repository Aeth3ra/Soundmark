import { useCallback, useEffect, useState } from "react";

/**
 * Watches a wavesurfer RegionsPlugin instance and reports right-clicks on
 * any region as { x, y, region } (or null when no menu should be shown).
 * `region` is the raw wavesurfer Region that was clicked, so callers can
 * tell them apart — e.g. an annotation region carries `region.__annotation`
 * (see useAnnotationRender), a plain selection region does not.
 */
export const useRegionContextMenu = (regionsPlugin) => {
	const [menuState, setMenuState] = useState(null);

	useEffect(() => {
		if (!regionsPlugin) return undefined;

		// One handler per region, closing over that specific region so the
		// caller always gets back exactly the region that was clicked.
		const handlersByRegion = new Map();

		const attach = (region) => {
			const handleContextMenu = (event) => {
				event.preventDefault();
				setMenuState({ x: event.clientX, y: event.clientY, region });
			};
			handlersByRegion.set(region, handleContextMenu);
			region.element?.addEventListener("contextmenu", handleContextMenu);
		};

		const detach = (region) => {
			const handleContextMenu = handlersByRegion.get(region);
			if (!handleContextMenu) return;
			region.element?.removeEventListener(
				"contextmenu",
				handleContextMenu
			);
			handlersByRegion.delete(region);
		};

		// Regions that already exist when this hook mounts...
		regionsPlugin.getRegions().forEach(attach);

		const unsubscribeCreated = regionsPlugin.on("region-created", attach);
		const unsubscribeRemoved = regionsPlugin.on("region-removed", detach);

		return () => {
			unsubscribeCreated();
			unsubscribeRemoved();
			regionsPlugin.getRegions().forEach(detach);
		};
	}, [regionsPlugin]);

	const close = useCallback(() => setMenuState(null), []);

	return { menuState, close };
};
