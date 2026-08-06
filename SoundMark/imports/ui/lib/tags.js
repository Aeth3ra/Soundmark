// Curated "default" tag set (~48 tags), grouped by category for browsing.
export const TAG_CATEGORIES = {
  Structure: [
    "Intro",
    "Verse",
    "Chorus",
    "Bridge",
    "Outro",
    "Solo",
    "Build-up",
    "Drop"
  ],
  Rhythm: ["Kick", "Snare", "Hi-Hat", "Bass", "Drum Fill"],
  Instruments: ["Guitar", "Piano", "Synth"],
  Vocals: ["Lead Vocal", "Backing Vocal", "Harmony"],
  Effects: [
    "Reverb",
    "Delay",
    "Compression",
    "EQ",
    "High-Pass Filter",
    "Low-Pass Filter",
    "Noise Reduction"
  ],
  "Key & Scale": ["Major", "Minor"],
  Tempo: ["Fast", "Medium", "Slow"],
  Mood: ["Happy", "Sad", "Energetic", "Calm"],
  Genre: ["Pop", "Rock", "Hip Hop", "EDM", "Jazz", "Classical"],
  Quality: ["Clean", "Noisy", "Clipping"],
  Workflow: [
    "Human Verified",
    "Review Needed",
    "Favorite",
    "Important",
    "Export"
  ]
};

// Flat list
export const ALL_PREDEFINED_TAGS = Object.values(TAG_CATEGORIES).flat();
