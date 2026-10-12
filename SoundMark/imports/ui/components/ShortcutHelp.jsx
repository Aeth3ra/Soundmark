import { useRef } from "react";
import { Info, X } from "lucide-react";
import { SHORTCUT_GROUPS } from "../lib/shortcuts";

const isMac =
	typeof navigator !== "undefined" &&
	/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

// Display names for keys that shouldn't just be upper-cased.
const KEY_LABELS = {
	mod: isMac ? "⌘" : "Ctrl",
	shift: isMac ? "⇧" : "Shift",
	alt: isMac ? "⌥" : "Alt",
	space: "Space",
	escape: "Esc",
	arrowleft: "←",
	arrowright: "→",
	arrowup: "↑",
	arrowdown: "↓"
};

const formatKey = (key) => KEY_LABELS[key] ?? key.toUpperCase();

const Keys = ({ combo }) => (
	<span className="flex items-center gap-1">
		{combo.split("+").map((part) => (
			<kbd key={part} className="kbd kbd-sm">
				{formatKey(part.trim().toLowerCase())}
			</kbd>
		))}
	</span>
);

// A button that opens a dialog listing every shortcut in lib/shortcuts.js.
// Usage: <ShortcutsHelp /> (e.g. in the header next to <NotificationHistory />)
// Pass `groups` to override the list, e.g. for a page-specific subset.
export const ShortcutsHelp = ({ groups = SHORTCUT_GROUPS }) => {
	const dialogRef = useRef(null);

	return (
		<>
			<button
				type="button"
				onClick={() => dialogRef.current?.showModal()}
				className="btn btn-ghost btn-sm btn-square"
				title="Keyboard shortcuts"
				aria-label="Show keyboard shortcuts"
			>
				<Info className="h-4 w-4" />
			</button>

			<dialog ref={dialogRef} className="modal">
				<div className="modal-box max-w-md">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-bold">
							Keyboard shortcuts
						</h2>
						<form method="dialog">
							<button
								className="btn btn-ghost btn-sm btn-square"
								aria-label="Close"
							>
								<X className="h-4 w-4" />
							</button>
						</form>
					</div>

					<div className="flex flex-col gap-5">
						{groups.map((group) => (
							<section key={group.id}>
								<h3 className="text-sm font-semibold text-base-content/60 mb-2">
									{group.title}
								</h3>
								<ul className="divide-y divide-base-300">
									{group.shortcuts.map((s) => (
										<li
											key={s.id}
											className="flex items-center justify-between gap-4 py-2 text-sm"
										>
											<span>{s.description}</span>
											<Keys combo={s.keys} />
										</li>
									))}
								</ul>
							</section>
						))}
					</div>
				</div>
				{/* Click outside / Esc closes it */}
				<form method="dialog" className="modal-backdrop">
					<button aria-label="Close">close</button>
				</form>
			</dialog>
		</>
	);
};
