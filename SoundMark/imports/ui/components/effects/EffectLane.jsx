import { EffectBand } from "./EffectBand";

/**
 * Flat mapping component, same shape as UserPresenceOverlay: the parent
 * owns the positioned/sized box, this just maps data to self-contained
 * children.
 *
 * @param bandSlots - from useEffectsRender
 */
export const EffectLane = ({ bandSlots = [] }) => {
	return (
		<>
			{bandSlots.map((slot) => (
				<EffectBand key={slot.id} slot={slot} />
			))}
		</>
	);
};
