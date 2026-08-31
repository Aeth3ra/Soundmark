// Small preset palette so annotations can be colour-coded at a glance
// (e.g. "red = needs fixing", "green = approved") without free-form pickers.
export const ANNOTATION_COLOURS = [
  { name: "Slate", value: "#64748b" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#10b981" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" }
];

export const DEFAULT_ANNOTATION_COLOUR = ANNOTATION_COLOURS[0].value;
