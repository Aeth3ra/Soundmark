# SoundMark

Real-time collaborative audio annotation and analysis in the browser. Upload a track, mark up the waveform, apply non-destructive effects to regions, and work on it together with other people through a shared link.

Built for **FIT3162** by a team of four. Aimed at musicians, music producers, and music educators.

![Meteor](https://img.shields.io/badge/Meteor-3.5-de4f4f) ![React](https://img.shields.io/badge/React-18-61dafb) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088ff)

## What it does

- **Upload and play** audio, with an interactive waveform, zoom, looping, volume, and playback speed from 0.0625× to 16×.
- **Annotate** a point in time or a region, with a title, colour, tags, and a comment.
- **Analyse** any selected region: duration, estimated BPM, pitch, and musical key.
- **Apply effects** to a region: peak normalisation, amplification, pitch/key shift, and low/high-pass filtering. Effects never modify the original file.
- **Collaborate live.** Share the session link; everyone sees each other's playheads, annotations, and effects as they happen, and can follow another person's playback.
- **Export** the original audio, the audio with effects baked in, a selected region, or a re-importable project package (`.sndmk`).

See [`SoundMark/docs/FEATURES.md`](./SoundMark/docs/FEATURES.md) for a full walkthrough.

## Quickstart

> The Meteor app lives in the `SoundMark/` subdirectory, not the repository root.

**Prerequisites:** [Meteor](https://docs.meteor.com/about/install.html) 3.5 (the project pins `METEOR@3.5.1`), Node.js 22, Git, and a Cloudflare R2 bucket for audio storage.

```bash
git clone https://github.com/Aeth3ra/Soundmark.git
cd Soundmark/SoundMark
meteor npm install

# Create private/settings.json with your R2 credentials (see docs/SETUP.md)
npm run dev
```

Open <http://localhost:3000>, enter a display name, and upload an audio file.

Without `private/settings.json` the app starts, but uploads and playback will fail because there is no storage configured. Full instructions, including the settings format and R2 CORS rules, are in [`SoundMark/docs/SETUP.md`](./SoundMark/docs/SETUP.md).

## Common commands

Run these from `SoundMark/`.

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Start the app with `private/settings.json`                      |
| `npm test`             | Run unit and integration tests once (needs settings)            |
| `npm run test:ci`      | Run unit and integration tests once, without settings (as in CI) |
| `npm run test:e2e`     | Run Playwright end-to-end tests                                 |
| `npm run test:e2e:ui`  | Run Playwright in interactive UI mode                           |
| `npm run lint`         | Lint the codebase with ESLint                                   |
| `npm run lint:fix`     | Lint and auto-fix                                               |
| `npm run visualize`    | Production build with the bundle visualiser                     |

More detail in [`SoundMark/docs/TESTING.md`](./SoundMark/docs/TESTING.md).

## Documentation

| Document | Contents |
| -------- | -------- |
| [SETUP.md](./SoundMark/docs/SETUP.md) | Install, configure R2, run, troubleshoot |
| [FEATURES.md](./SoundMark/docs/FEATURES.md) | What each feature does, effect ranges, shortcuts, project packages |
| [ARCHITECTURE.md](./SoundMark/docs/ARCHITECTURE.md) | How the client, server, MongoDB, R2, and browser audio engine fit together |
| [API.md](./SoundMark/docs/API.md) | Meteor methods, publications, and collections reference |
| [FILE_STRUCTURE.md](./SoundMark/docs/FILE_STRUCTURE.md) | Directory layout and where to find things |
| [TESTING.md](./SoundMark/docs/TESTING.md) | Unit, integration, and e2e tests; CI pipeline |

## Tech stack

| Area             | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| Framework        | Meteor 3.5 (Node 22), Rspack bundler                        |
| Frontend         | React 18, React Router 7                                    |
| Styling          | Tailwind CSS 4, DaisyUI 5 (`night` theme), lucide-react     |
| Database         | MongoDB (via Meteor)                                        |
| File storage     | Cloudflare R2 through the AWS S3 SDK and presigned URLs     |
| Waveform         | WaveSurfer.js 7 (Regions and Zoom plugins)                  |
| Audio processing | Web Audio API, Tone.js                                      |
| Audio analysis   | Meyda                                                       |
| Project packages | JSZip                                                       |
| Testing          | Mocha (`meteortesting:mocha`), Testing Library, Chai, Sinon, Playwright |

## How it fits together

```text
Browser (React) ──DDP──▶ Meteor server ──▶ MongoDB   (metadata, annotations, effects, presence)
      │                       │
      │                       └── signs short-lived URLs ──▶ Cloudflare R2
      └──────── upload / download audio directly ─────────────▶ Cloudflare R2
```

Audio never passes through the Meteor server: the server hands the browser a presigned URL, and the browser talks to R2 directly. Effects, analysis, and export all run in the browser. See [ARCHITECTURE.md](./SoundMark/docs/ARCHITECTURE.md).

## Sessions in one paragraph

Uploading a file creates a session. The first person to join becomes the **host**, and anyone with the link can join as a guest, with no account needed. **When the host leaves, the session ends for everyone and the audio file is deleted from storage.** Export a project package if you want to keep your work.

## Team

| Name           | Email                | GitHub        |
| -------------- | -------------------- | ------------- |
| Vanrick Nguyen | <vngu0104@gmail.com> | vanricknguyen |
| Oliver Tan     | [email]              | DatKid321     |
| Ritvik Sharma  | [email]              | Aeth3ra       |
| Danny Wu       | [email]              | DanDom2019    |
