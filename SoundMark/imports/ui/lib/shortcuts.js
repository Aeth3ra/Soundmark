// Single source of truth for the keyboard shortcuts the app supports.

export const SHORTCUT_GROUPS = [
	{
		id: "playback",
		title: "Playback",
		shortcuts: [
			{ id: "playPause", keys: "k", description: "Play / pause" },
			{
				id: "seekBackwards",
				keys: "j",
				description: "Seek -2.5s backwards"
			},
			{
				id: "seekForwards",
				keys: "l",
				description: "Seek +2.5s backwards"
			}
		]
	},
	{
		id: "regions",
		title: "Selection & editing",
		shortcuts: [
			{
				id: "createAnnotation",
				keys: "mod+a",
				description: "Create annotation"
			},
			{
				id: "applyEffect",
				keys: "mod+e",
				description: "Apply effect to selection"
			},
			{
				id: "clearRegion",
				keys: "mod+d",
				description: "Clear selected region"
			}
		]
	}
];

export const getShortcutKeys = (id) =>
	SHORTCUT_GROUPS.flatMap((g) => g.shortcuts).find((s) => s.id === id)?.keys;
