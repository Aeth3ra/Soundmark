# SOUNDMARK

Collaborative audio annotation and analysis tool built for FIT3170. SOUNDMARK allows musicians and music producers to upload audio, interact with its waveform, create musical annotations, apply audio effects, and collaborate with other users in real time.

> **All application code and documentation are contained within this repository. Start with this README for setup and project documentation.**

## Quickstart

```bash
npm install
meteor run
```

Open the local application URL provided by Meteor in your browser.

See [`docs/SETUP.md`](docs/SETUP.md) for the complete setup guide, including environment variables and external services.

## Documentation

- **[`docs/SETUP.md`](docs/SETUP.md)** — development setup, dependencies, environment variables, and running SOUNDMARK locally.
- **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — how the Meteor client, server, MongoDB, cloud storage, and audio-processing components interact.
- **[`docs/FILE_STRUCTURE.md`](docs/FILE_STRUCTURE.md)** — overview of the project's directory structure and the responsibilities of its major components.
- **[`docs/FEATURES.md`](docs/FEATURES.md)** — overview of SOUNDMARK's major features and functionality.
- **[`docs/ANNOTATIONS.md`](docs/ANNOTATIONS.md)** — annotation creation, editing, persistence, and waveform rendering.
- **[`docs/AUDIO_PROCESSING.md`](docs/AUDIO_PROCESSING.md)** — audio playback, waveform interaction, effects, analysis, and export.
- **[`docs/COLLABORATION.md`](docs/COLLABORATION.md)** — real-time collaboration, presence, and synchronisation between users.

## Project Structure

```text
SOUNDMARK/
├── client/              # Meteor client entry point and configuration
├── imports/
│   ├── api/             # Collections, methods, publications, and server logic
│   └── ui/              # React components, pages, hooks, and frontend logic
├── server/              # Meteor server entry point
├── public/              # Public static assets
├── private/             # Private application configuration
├── docs/                # Project and technical documentation
├── tests/               # Automated tests
├── package.json         # Dependencies and project scripts
└── README.md            # Project overview and setup
```

> `.meteor/`, `_build/`, and `node_modules/` are generated or framework-managed directories and are not included in the application structure above.

See [`docs/FILE_STRUCTURE.md`](docs/FILE_STRUCTURE.md) for a more detailed explanation of the project's organisation.

## Tech Stack

| Area             | Technology             |
| ---------------- | ---------------------- |
| Framework        | Meteor.js              |
| Frontend         | React                  |
| Styling          | Tailwind CSS, DaisyUI  |
| Database         | MongoDB                |
| File Storage     | Cloudflare R2          |
| Waveform         | WaveSurfer.js          |
| Audio Processing | Web Audio API, Tone.js |
| Audio Analysis   | Meyda.js               |
| Audio Conversion | ffmpeg.wasm            |

## Key Features

- **Audio Upload** — import WAV, MP3, and FLAC audio files.
- **Interactive Waveform** — view, navigate, zoom, and select regions of audio.
- **Audio Annotations** — create, edit, and delete timestamp and region annotations.
- **Audio Analysis** — automatically populate properties such as duration, BPM, pitch, and key where supported.
- **Audio Effects** — apply audio effects to selected regions.
- **Real-Time Collaboration** — multiple users can work within the same workspace and see collaborative updates.
- **Audio Export** — export processed audio while preserving the required audio format and effects.

## Team

| Name           | Email                | GitHub        |
| -------------- | -------------------- | ------------- |
| Vanrick Nguyen | <vngu0104@gmail.com> | vanricknguyen |
| Oliver Tan     | [email]              | DatKid321     |
| Ritvik Sharma  | [email]              | Aeth3ra       |
| Danny Wu       | [email]              | DanDom2019    |

## Project

**Project:** SOUNDMARK
**Target Users:** Musicians, music producers, and music educators
