import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";

/**
 * A small positioned menu, rendered at `position` with the given `items`.
 * Purely presentational: it has no idea what "annotations" or "effects"
 * are, so the same component could back a right-click menu anywhere else
 * in the app.
 *
 * items: Array<{ label: string, onClick: () => void, disabled?: boolean, danger?: boolean }>
 */
export const RegionContextMenu = ({ position, items, onClose }) => {
	// Escape closes the menu, same as clicking outside it. Reuses the same
	// shortcut hook everything else in the page uses.
	useKeyboardShortcut("escape", onClose, { enabled: Boolean(position) });

	if (!position) return null;

	return (
		<>
			{/* Full-screen, invisible catcher: any click or right-click outside
			    the menu itself closes it. Sits below the menu (z-40 vs z-50). */}
			<div
				className="fixed inset-0 z-40"
				onClick={onClose}
				onContextMenu={(event) => {
					event.preventDefault();
					onClose();
				}}
			/>
			<ul
				className="menu menu-sm bg-base-100 rounded-box shadow-lg border border-base-300 z-50 fixed w-52 p-1"
				style={{ top: position.y, left: position.x }}
			>
				{items.map((item) => (
					<li key={item.label}>
						<button
							type="button"
							disabled={item.disabled}
							className={item.danger ? "text-error" : ""}
							onClick={() => {
								item.onClick();
								onClose();
							}}
						>
							{item.label}
						</button>
					</li>
				))}
			</ul>
		</>
	);
};
