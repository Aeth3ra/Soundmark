# Architecture

SoundMark is a Meteor 3 application with a React front end. The server is deliberately thin: it stores metadata in MongoDB, signs URLs for Cloudflare R2, and keeps collaborators in sync. **All audio decoding, effects, analysis, and export run in the browser.**

## System overview

```text
┌────────────────────────── Browser ──────────────────────────┐
│  React UI ── hooks ── services ──┐                          │
│  WaveSurfer · Web Audio · Tone · Meyda · JSZip              │
└──────────────┬───────────────────┼──────────────────────────┘
               │ DDP (methods +    │ HTTPS: presigned PUT / GET
               │ publications)     │ (audio bytes)
               ▼                   ▼
        ┌─────────────┐      ┌───────────────┐
        │ Meteor      │─────▶│ Cloudflare R2 │
        │ server      │ signs│ (audio files) │
        └──────┬──────┘ URLs └───────────────┘
               ▼
          ┌─────────┐
          │ MongoDB │  audioFiles · annotations · effects · presence · sessions · users
          └─────────┘
```

| Concern | Where it happens |
| ------- | ---------------- |
| Rendering, playback, waveform | Browser |
| Effects, analysis, export | Browser (Web Audio API, Tone.js, Meyda) |
| Persisting annotations, effects, file records | Server → MongoDB, through Meteor methods |
| Real-time sync | Meteor publications and subscriptions over DDP |
| Audio file storage | Cloudflare R2, accessed directly by the browser via presigned URLs |
| Signing URLs, validation, permissions | Server |

## Client

Entry point: `client/main.jsx` mounts `<App />` from `imports/ui/App.jsx`.

### Routing

| Route | Component | Notes |
| ----- | --------- | ----- |
| `/login` | `LoginPage` | Enter a display name |
| `/` | `UploadPage` | Upload audio or import a `.sndmk` package |
| `/player/:fileId` | `PlayerPage` | The collaborative workspace |

`/` and `/player/:fileId` are wrapped in `RequireGuestName`, which redirects to `/login` until the user has a display name. The router is wrapped in `NotificationProvider`, with `ConnectionStatus` always mounted.

### Layers

The UI is split into four layers. Keeping them separate is what makes the code testable.

| Layer | Folder | Responsibility |
| ----- | ------ | -------------- |
| Components | `imports/ui/components/` | Presentational and interactive UI |
| Hooks | `imports/ui/hooks/` | Behaviour: WaveSurfer lifecycle, regions, presence, sync, shortcuts, notifications |
| Services | `imports/ui/services/` | Thin wrappers around `Meteor.callAsync` and fetch; also upload, export, and package import |
| Utils / lib | `imports/ui/utils/`, `imports/ui/lib/` | Pure logic: audio math, effect rendering, package format, effect definitions, tags, shortcuts |

### The player page

`PlayerPage.jsx` is the composition root. It:

1. Fetches a presigned download URL (`getPlayableUrl`) and hands it to `useWavesurfer`.
2. Subscribes to `effects.forFile`, `annotations.forFile`, and `annotations.authorsForFile`, plus the presence and session publications via hooks.
3. Computes **playback effects** from saved effects and the user's local mutes, and passes them to `useWavesurfer` so the preview is re-rendered when they change.
4. Wires up regions, analysis, sync, notifications, keyboard shortcuts, and the right-click menu.

### Audio pipeline (browser)

```text
presigned URL ─▶ fetch ─▶ decodeAudioData ─▶ AudioBuffer (original, never mutated)
                                                  │
                  saved effects (ordered) ────────┤
                                                  ▼
                              applyEffectsChain (Tone.Offline / OfflineAudioContext)
                                                  │
                         ┌────────────────────────┴───────────────┐
                         ▼                                        ▼
                  encodeWavBlob ─▶ WaveSurfer preview      slice / encode ─▶ download
```

Key points:

- The **original upload is never modified.** Effects are stored as documents and re-applied from the source buffer every time, for preview and for export.
- The preview is rendered to a WAV blob (`createPreviewBlob`) and loaded into WaveSurfer. The UI shows "Updating audio preview…" while this runs.
- Effect definitions (`lib/effectTypes.js`) are the single source of truth for labels, parameter ranges, defaults, and validation on the client.
- Region analysis (`utils/audioAnalysis.js`) uses Meyda for RMS and custom estimators for BPM, pitch (YIN-style), and key.

### Local-only choices

Some state intentionally never touches the server:

- **Muting another user's effect** for your own playback (`getPlaybackEffects`). This doesn't change what others hear or what gets exported.
- **Hiding an annotation** from the waveform overlay.
- **Tag filters**, panel open/closed state, zoom, and volume.

## Server

`server/main.js` imports each domain's methods and publications. Domain code lives in `imports/api/<domain>/`, each with a collection, methods, publications (where applicable), and co-located tests.

| Domain | Collection | Purpose |
| ------ | ---------- | ------- |
| `audio` | `audioFiles` | File records and R2 interaction (presigned URLs, deletion) |
| `annotations` | `annotations` | Timestamp and region annotations |
| `effects` | `effects` | Per-region effects |
| `presences` | `presence` | Who is in a workspace, and where their playhead is |
| `sessions` | `sessions` | Which user is host of each file's workspace |
| `users` | `users` (Meteor) | Guest accounts and display names |

Full method and publication reference: [API.md](./API.md).

### Guest accounts

There are no passwords. `users/guestLoginHandler.js` registers a custom `"guest"` login handler on top of `accounts-base`. The client calls it once, the server inserts a user with `guest: true`, and returns a login token. The user then sets a display name via `user.setDisplayName`, stored at `profile.name`.

`public.packages.accounts.clientStorage: "session"` keeps the token in `sessionStorage`, so every tab is a distinct guest and closing the tab discards the identity.

Annotations and effects store only `createdBy` (the user id). Display names are looked up at read time through the `annotations.authorsForFile` composite publication, so renaming a user updates their existing annotations everywhere.

### Audio storage

MongoDB holds a small record per file; R2 holds the bytes.

```text
audioFiles: { _id, key: "audio/<randomId>-<filename>", fileName, contentType, status, createdAt }
```

**Upload flow**

1. Client calls `audio.getUploadUrl(filename, contentType)`.
2. Server creates an `audioFiles` record (`status: "pending"`) and returns a presigned **PUT** URL (valid 5 minutes) plus `fileId`.
3. Client `PUT`s the file straight to R2, then navigates to `/player/<fileId>`.

**Playback and export** use `audio.getDownloadUrl` and `audio.getExportInfo`, which return presigned **GET** URLs (also 5 minutes). The URL is re-fetched on each page load rather than stored.

The bucket needs a CORS policy for this to work from the browser. See [SETUP.md](./SETUP.md#configure-cors-on-the-bucket).

## Real-time collaboration

Collaboration is built entirely on Meteor's reactive publications. There is no separate WebSocket layer.

| Feature | Mechanism |
| ------- | --------- |
| Live annotations and effects | `annotations.forFile` and `effects.forFile` publications; mutations via methods |
| Who's here | `presence.forFile` publication; each client calls `presence.update` with its position, play state, and playback rate |
| Following someone | Client-side: `useWaveformSync` watches the followed user's presence doc and seeks, plays, pauses, and matches rate when drift exceeds 0.75 s (checked every 300 ms) |
| Activity toasts | `useActivityNotifications` diffs the reactive collections and announces others' changes with a "View" action |
| Connection state | `useConnectionStatus` and `ConnectionStatus` banner |

### Sessions and hosts

A session is one document in `sessions` whose `_id` **is the `fileId`**: `{ _id: fileId, hostId, createdAt }`.

- **Creation.** The first `presence.update` for a file with zero existing presences creates the session and makes the caller host. Using the file id as `_id` makes this race-safe: a duplicate-key error (code 11000) just means someone else won.
- **Late joiners to a dead room.** If the session is gone but presence docs remain (host just left), `presence.update` is ignored so nobody can resurrect the session or claim host.
- **Ending.** When the host leaves, `endSession` removes the session doc, all presence docs for that file, and the audio. `deleteAudioFile` deletes the R2 object, the Mongo record, and the file's annotations and effects. Other clients see the session end and are redirected home with a notice.

### Presence cleanup

Three overlapping mechanisms keep presence accurate:

1. `presence.leave` on clean unmount or navigation (best effort).
2. `connection.onClose`. The server maps each DDP connection to its `{ fileId, userId }` and cleans up the instant a connection really closes. A backgrounded tab does not close its connection, so it stays present.
3. A sweep every 15 s removes presence docs not updated for 5 minutes whose connection is no longer tracked.

In all three, if the departing user is the host, the session ends.

## Validation and permissions

Server methods validate inputs with `check()` and domain rules. Current behaviour:

| Operation | Requires login | Extra rules |
| --------- | :------------: | ----------- |
| `annotations.create` | Yes | File must exist; `0 ≤ start`, `end > start`, within audio duration when known |
| `annotations.update` | Yes | Field types checked; time range is **not** re-validated server-side; any logged-in user may edit |
| `annotations.delete` | No | n/a |
| `effects.create` | Yes | File must exist; per-type parameter ranges; within duration when known |
| `effects.update` / `effects.delete` | Yes | **Creator or session host only** |
| `audio.*` | No | n/a |
| `presence.update` | Yes | n/a |

See [Known limitations](#known-limitations) for what this means in practice.

## Build and tooling

- **Bundler:** Rspack via `@meteorjs/rspack` (`rspack.config.js`), with SWC for JSX (`.swcrc`, automatic runtime). SVGs can be imported as React components (`@svgr/webpack`). `buffer` and `process` are polyfilled for the client bundle because Chai's browser build expects them.
- **Styling:** Tailwind 4 through PostCSS (`postcss.config.mjs`); DaisyUI with the `night` theme as default (`imports/ui/styles.css`).
- **Meteor packages:** `mongo`, `accounts-base`, `react-meteor-data`, `reywood:publish-composite`, plus test packages (`meteortesting:mocha`, `dburles:factory`, `communitypackages:publication-collector`).
- **Excluded from Meteor builds:** `e2e/`, Playwright config and outputs (`.meteorignore`), so test runs don't trigger app rebuilds.

## Known limitations

These come from reading the current code and are worth knowing before you build on it. Annotations and effects are cleaned up with the audio file, but data from sessions that ended before that was added may still be orphaned in MongoDB.

- **Audio methods don't check login or membership.** Anyone who knows a `fileId` can request its URLs or delete it. Treat session links as secrets.
- **Annotation edit and delete aren't owner-restricted**, unlike effects.
- **Sessions are ephemeral by design.** There's no persistence once the host leaves; use project packages to keep work.
- **Duration isn't stored on audio records**, so server-side time-range checks against duration are skipped. The client re-checks against the decoded duration.
- **`presence.forFile` and `sessions.forFile` publications don't require login.**
