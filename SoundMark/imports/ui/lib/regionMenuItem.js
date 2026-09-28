/**
 * @typedef {Object} MenuItem
 * @property {string} label
 * @property {() => void} onClick
 * @property {boolean} [disabled]
 * @property {boolean} [danger]
 */

/**
 * Builds the items for the annotation entry of the region right-click menu
 * (right-clicking a wavesurfer region that carries annotation metadata —
 * see `__annotation` in useAnnotationRender).
 *
 * @param {{
 *   annotation: { _id: string },
 *   isHidden: boolean,
 *   onToggleHidden: (id: string) => void,
 *   onEdit: (annotation: object) => void,
 *   onDelete: (annotation: object) => void
 * }} params
 * @returns {MenuItem[]}
 */
export const buildAnnotationMenuItems = ({
	annotation,
	isHidden,
	onToggleHidden,
	onEdit,
	onDelete
}) => [
	{
		label: isHidden ? "Show on waveform" : "Hide from waveform",
		onClick: () => onToggleHidden(annotation._id)
	},
	{
		label: "Edit annotation",
		onClick: () => onEdit(annotation)
	},
	{
		label: "Delete annotation",
		onClick: () => onDelete(annotation),
		danger: true
	}
];

/**
 * Builds the items for the region-selection entry of the same menu
 * (right-clicking the plain, ephemeral selection region rather than an
 * annotation).
 *
 * @param {{
 *   onCreateAnnotation: () => void,
 *   onApplyEffect: () => void,
 *   canApplyEffect: boolean,
 *   onDeleteRegion: () => void
 * }} params
 * @returns {MenuItem[]}
 */
export const buildSelectionMenuItems = ({
	onCreateAnnotation,
	onApplyEffect,
	canApplyEffect,
	onDeleteRegion
}) => [
	{ label: "Create annotation", onClick: onCreateAnnotation },
	{
		label: "Apply effect",
		onClick: onApplyEffect,
		disabled: !canApplyEffect
	},
	{ label: "Delete region", onClick: onDeleteRegion, danger: true }
];

/**
 * Picks which set of items the region right-click menu should show.
 *
 * @param {{ annotation: object|null } & Parameters<typeof buildAnnotationMenuItems>[0] & Parameters<typeof buildSelectionMenuItems>[0]} params
 * @returns {MenuItem[]}
 */
export const buildRegionMenuItems = ({ annotation, ...params }) =>
	annotation
		? buildAnnotationMenuItems({ annotation, ...params })
		: buildSelectionMenuItems(params);
