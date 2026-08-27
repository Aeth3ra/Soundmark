const COLORS = [
  "#f87171", // red
  "#fb923c", // orange
  "#facc15", // yellow
  "#4ade80", // green
  "#22d3ee", // cyan
  "#818cf8", // indigo
  "#e879f9" // pink
];

export function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}
