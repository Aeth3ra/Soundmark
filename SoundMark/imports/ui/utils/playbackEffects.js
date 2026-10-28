/**
 * Produces an effective list of effects for local preview playback by temporarily
 * disabling effects that the local user has muted, without mutating the shared saved effects.
 *
 * @param {Array<object>} effects - Shared effects list from the database.
 * @param {Set<string>} mutedEffectIds - Set of effect IDs the current user has muted locally.
 * @param {string|null} userId - ID of the active user.
 * @returns {Array<object>} List of effects adjusted for local auditioning.
 */
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
