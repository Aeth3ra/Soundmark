// Local audition choices never change the saved effects used by other users or exports.
export function getPlaybackEffects(effects, mutedEffectIds, userId) {
	if (!userId || mutedEffectIds.size === 0) return effects;

	return effects.map((effect) =>
		effect.enabled &&
		effect.createdBy !== userId &&
		mutedEffectIds.has(effect._id)
			? { ...effect, enabled: false }
			: effect
	);
}
