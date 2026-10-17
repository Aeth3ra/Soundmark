# Features Guide

A walkthrough of what SoundMark does and how to use it.

## Getting started

1. **Pick a name.** First-time visitors are sent to `/login` and asked for a display name (up to 30 characters). There are no passwords or accounts; you're a guest. You can rename yourself later from the upload page.
2. **Upload audio.** Drag a file onto the upload page or click to browse. Any browser-playable audio is accepted (the UI mentions MP3, WAV, M4A, and FLAC). Non-audio files are rejected with an error.
3. **You are now the host** of a new session at `/player/<fileId>`.
4. **Invite others** with **Share session**, which copies the link. Anyone who opens it and picks a name joins your workspace.

> **Heads up:** when the host leaves, the session ends for everyone and the audio is deleted. Export a project package first if you want to keep your work. See [Project packages](#project-packages).

## Playback and waveform

| Control | Details |
| ------- | ------- |
| Play / pause | Button or <kbd>K</kbd> |
| Seek | Click the waveform or scrub bar; <kbd>J</kbd> / <kbd>L</kbd> jump back / forward 2.5 s |
| Loop | Repeat toggle |
| Speed | Type any value from **0.0625× to 16×** |
| Volume | Slider |
| Zoom | Zoom control; the waveform scrolls horizontally when zoomed in |

### Selecting a region

Drag on the waveform to select a region. The toolbar shows the selection's length plus analysis (see below). A selected region is the starting point for annotating, applying effects, or exporting a selection. Clear it with the clear button or <kbd>Ctrl/⌘</kbd>+<kbd>D</kbd>.

Right-click a region for a context menu (create annotation, apply effect, clear selection, or, on an existing annotation, edit, hide, or delete it).

## Region analysis

Select a region and SoundMark estimates, in your browser:

- **Duration**
- **BPM**
- **Pitch**
- **Key** (e.g. `A minor`)

Analysis is an estimate and may be blank for silent or very short selections. Annotation cards show the same analysis for their own time range when the annotations panel is open.

## Annotations

Open the annotations panel with the list icon in the right rail. The badge shows how many exist.

An annotation is either a **timestamp** (no selection) or a **region** (with a selection) and has:

| Field | Notes |
| ----- | ----- |
| Title | Free text |
| Colour | One of 8 presets: Slate, Red, Orange, Amber, Emerald, Sky, Violet, Pink |
| Tags | Pick from curated categories or add your own (see below) |
| Comment | Free text |
| Start / end | Seconds; `end` must be after `start` and within the audio |

**Creating:** <kbd>Ctrl/⌘</kbd>+<kbd>A</kbd>, the right-click menu, or the **+** button in the panel. With a region selected it annotates the region; otherwise it uses the playhead position.

**Working with them:** click a card to seek to it, filter by tag, hide any annotation from the waveform overlay (this is local to you), and edit or delete from the card or the right-click menu. Hovering a marker shows a tooltip with the author's name.

### Built-in tags

| Category | Tags |
| -------- | ---- |
| Structure | Intro, Verse, Chorus, Bridge, Outro, Solo, Build-up, Drop |
| Rhythm | Kick, Snare, Hi-Hat, Bass, Drum Fill |
| Instruments | Guitar, Piano, Synth |
| Vocals | Lead Vocal, Backing Vocal, Harmony |
| Effects | Reverb, Delay, Compression, EQ, High-Pass Filter, Low-Pass Filter, Noise Reduction |
| Key & Scale | Major, Minor |
| Tempo | Fast, Medium, Slow |
| Mood | Happy, Sad, Energetic, Calm |
| Genre | Pop, Rock, Hip Hop, EDM, Jazz, Classical |
| Quality | Clean, Noisy, Clipping |
| Workflow | Human Verified, Review Needed, Favorite, Important, Export |

Defined in `imports/ui/lib/tags.js`.

## Effects

Open the effects panel with the wand icon. Select a region first, then **Apply effect** or <kbd>Ctrl/⌘</kbd>+<kbd>E</kbd>.

Effects are **non-destructive**: the original file is untouched, and effects are re-applied from the source whenever the preview is rebuilt or audio is exported.

| Effect | Parameter | Range | Notes |
| ------ | --------- | ----- | ----- |
| Peak normalisation | Target peak | −6 to 0 dB | Sets the loudest point in the region to this level. −1 dB is the default and can't clip |
| Region amplification | Gain | −24 to +24 dB | 0 leaves the level unchanged. Would-be clipping is limited rather than blocked |
| Pitch / key shift | Semitones | −24 to +24 (integers) | 12 semitones is one octave |
| Low / high-pass filter | Type, cutoff | 1 to 24,000 Hz | Low-pass keeps frequencies below the cutoff; high-pass keeps those above |

Each effect has an **enabled** toggle and an **order**; effects apply in order. Effects from older versions with out-of-range or missing parameters are flagged "recreate effect".

**Permissions:** you can edit or delete an effect if you created it **or** you are the session host.

**Local mute:** you can mute someone else's effect for your own listening only. It doesn't affect other people or exports.

## Collaboration

| Feature | What you see |
| ------- | ------------ |
| Workspace users | Avatars in the header; the host has a crown badge |
| Live playheads | Coloured playhead per participant on the waveform |
| Follow / sync | Lock onto another person's playhead. Your player matches their position, play/pause state, and speed, and re-syncs if you drift more than 0.75 s. Unlock from the sync badge |
| Live content | Annotations and effects created by others appear immediately |
| Activity toasts | "X added an annotation" with a **View** button that opens the panel and jumps to it |
| Notification history | Bell icon in the header |
| Connection banner | Shown when your connection to the server drops |

If the host leaves, other users are returned to the home page with a "session ended" notice.

## Exporting

Use the **Export** menu in the toolbar. Only one export runs at a time.

| Option | Output |
| ------ | ------ |
| Original audio | The uploaded file, unchanged |
| Audio with effects | Full track rendered with all enabled effects, as 16-bit PCM **WAV** |
| Selection | The selected region only, with effects applied, as WAV (`…-<start>-<end>.wav`) |
| Project | A `.sndmk` project package (below) |

## Project packages

A project package is a zip file with the extension `.sndmk` containing the audio plus all annotations and effects. It's the only way to keep a session after the host leaves.

```text
<name>-soundmark-package.sndmk
├── manifest.json      version, exportedAt, fileName, contentType, audioPath, counts
├── annotations.json   title, colour, start, end, tags, comment
├── effects.json       type, start, end, params, enabled, order
└── audio/<fileName>   the original audio
```

**Importing:** on the upload page, choose the package. SoundMark uploads the audio as a *new* file, recreates every annotation and effect against it, and opens the new session with you as host. If anything fails partway, the new upload is rolled back.

Notes:

- Authorship (`createdBy`), ids, and timestamps are not carried over; imported items belong to the importer.
- Packages are versioned (`PACKAGE_VERSION = 1`). A package from an incompatible version, or one containing invalid effects, is rejected with a clear message.

## Keyboard shortcuts

`mod` means <kbd>Ctrl</kbd> on Windows/Linux and <kbd>⌘</kbd> on macOS. A shortcuts help button sits at the bottom of the right rail.

| Shortcut | Action |
| -------- | ------ |
| <kbd>K</kbd> | Play / pause |
| <kbd>J</kbd> | Seek back 2.5 s |
| <kbd>L</kbd> | Seek forward 2.5 s |
| <kbd>mod</kbd>+<kbd>A</kbd> | Create annotation |
| <kbd>mod</kbd>+<kbd>E</kbd> | Apply effect to selection |
| <kbd>mod</kbd>+<kbd>D</kbd> | Clear selected region |

Shortcuts are defined in one place, `imports/ui/lib/shortcuts.js`, which also feeds the help dialog.

## Browser notes

Effects, analysis, and export rely on the Web Audio API (`OfflineAudioContext`). Use a current version of Chrome, Edge, Firefox, or Safari. Very long files use more memory because the full track is decoded in the browser.
