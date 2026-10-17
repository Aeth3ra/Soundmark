# File Structure

SoundMark follows Meteor's `imports/` convention: nothing under `imports/` loads until something imports it. Server code lives in `imports/api/`, client code in `imports/ui/`, and each side has thin entry points.

## Repository layout

```text
Soundmark/
├── .github/workflows/ci.yml   # Lint, unit/integration tests, Playwright e2e
├── .gitignore
├── README.md
├── CONTRIBUTING.md
└── SoundMark/                 # The Meteor app: run all commands from here
    ├── .meteor/               # Meteor config (release, packages, versions)
    ├── client/
    ├── server/
    ├── imports/
    │   ├── api/
    │   └── ui/
    ├── e2e/                   # Playwright end-to-end tests
    ├── tests/                 # Mocha entry points for Meteor's test runner
    ├── public/                # Static assets (icons, favicon)
    ├── private/               # Gitignored; holds settings.json (you create this)
    ├── docs/                  # You are here
    ├── package.json
    ├── playwright.config.js
    ├── rspack.config.js
    ├── eslint.config.mjs
    ├── postcss.config.mjs
    └── .swcrc
```

## Entry points

| File | Role |
| ---- | ---- |
| `client/main.jsx` | Mounts `<App />` into `#react-target` and loads `styles.css` |
| `client/main.html` | HTML shell: title, icons, Inter font |
| `server/main.js` | Imports every collection, method, and publication module |
| `tests/client.js` | Loads every `imports/ui/**/*.test.js(x)` file |
| `tests/server.js` | Loads every `imports/**/*.test.js` file |

These are wired up in `package.json` under `meteor.mainModule` and `meteor.testModule`.

## `imports/api/`: server domains

One folder per domain. Each holds a collection, methods, publications (where relevant), and tests beside them.

```text
api/
├── annotations/
│   ├── annotationsCollection.js
│   ├── annotationsMethods.js        (+ .test.js)
│   └── annotationsPublications.js   (+ .test.js)
├── audio/
│   ├── audioCollection.js
│   ├── audioMethods.js              (+ .test.js)
│   └── r2.js                        # Cloudflare R2 (S3) client from Meteor.settings.private.r2
├── effects/
│   ├── effectsCollection.js
│   ├── effectsMethods.js            (+ .test.js)
│   └── effectsPublications.js       (+ .test.js)
├── presences/
│   ├── presenceCollection.js
│   ├── presenceMethods.js           (+ .test.js)   # also runs stale-presence sweep
│   └── presencePublications.js      (+ .test.js)
├── sessions/
│   ├── sessionCollection.js
│   ├── sessionMethods.js            (+ .test.js)   # host logic, endSession
│   └── sessionPublications.js       (+ .test.js)
└── users/
    ├── guestLoginHandler.js         (+ .test.js)
    └── userMethods.js               (+ .test.js)
```

See [API.md](./API.md) for what each exposes.

## `imports/ui/`: React front end

```text
ui/
├── App.jsx                    # Router, providers, route table
├── styles.css                 # Tailwind + DaisyUI (night theme)
├── pages/
├── components/
├── hooks/
├── services/
├── utils/
└── lib/
```

### `pages/`

| File | Route |
| ---- | ----- |
| `LoginPage.jsx` | `/login` |
| `UploadPage.jsx` | `/`: upload audio, import a project package |
| `PlayerPage.jsx` | `/player/:fileId`: the workspace; composes nearly every hook and component |

### `components/`

Top-level components are general; subfolders group a feature.

| Path | Contents |
| ---- | -------- |
| `PlayerControls.jsx` | Play, loop, speed, volume, zoom |
| `AudioExportButton.jsx` | The Export menu |
| `RegionSelectionDisplay.jsx` | Selected region summary and analysis |
| `RegionContextMenu.jsx` | Right-click menu |
| `WorkspaceUser.jsx`, `SyncStatusToggle.jsx` | Participants and follow/sync badge |
| `EditableName.jsx`, `RequireGuestName.jsx` | Display-name editing and the route guard |
| `ShortcutHelp.jsx`, `ModalDialog.jsx`, `ToastError.jsx` | Shared UI |
| `annotations/` | `AnnotationForm`, `AnnotationList`, `AnnotationCard`, `AnnotationMarker(s)Layer`, `AnnotationToolTip` |
| `effects/` | `EffectForm`, `EffectField`, `EffectList`, `EffectCard`, `EffectBand`, `EffectLane` |
| `notifications/` | `NotificationProvider`, toasts, history, `ConnectionStatus`, `SessionEndToast` |
| `waveform/` | `WaveformDisplay`, `ScrubBar`, `UserPlayhead`, `UserPresenceOverlay` |

### `hooks/`

| Group | Hooks |
| ----- | ----- |
| Audio and waveform | `useWaveSurfer`, `useRegions`, `useRegionSelection`, `useRegionContextMenu`, `useZoom`, `useWaveformWidth`, `useEffectLane` |
| Analysis | `useRegionAnalysis`, `useAnnotationAnalysis` |
| Annotations | `useAnnotationRender`, `useAnnotationTrigger` |
| Collaboration | `usePresence`, `useWaveformSync`, `useSession`, `useUsernames` |
| Identity | `useGuestAccount` |
| Notifications | `useActivityNotifications`, `usePresenceNotifications`, `useProcessingNotification`, `useConnectionStatus`, `useNotifiedExport` |
| Input | `useKeyboardShortcut` |

### `services/`

Boundary between the UI and the server or browser APIs. Hooks and components call these rather than `Meteor.callAsync` directly.

| File | Purpose |
| ---- | ------- |
| `audioService.js` | Upload, signed URLs, decode, preview render, and the three audio exports |
| `annotationService.js`, `effectsService.js` | Create, update, delete wrappers |
| `userService.js`, `guestLogin.js` | Display name and guest login |
| `projectPackageService.js` | Export and import `.sndmk` packages |

### `utils/`: pure logic

| File | Purpose |
| ---- | ------- |
| `audioAnalysis.js` | RMS and peak, BPM, pitch, and key estimation (`analyseRegion`) |
| `audioEffects.js` | `applyEffectsChain`: renders effects onto an `AudioBuffer` |
| `audioExport.js` | Slice, splice, clone, and WAV-encode audio buffers |
| `playbackEffects.js` | Applies a user's local mutes to the effect list |
| `projectPackage.js` | Package format, build, parse, and validation |
| `time.js` | Time formatting helpers |

### `lib/`: shared definitions

| File | Purpose |
| ---- | ------- |
| `effectTypes.js` | **Single source of truth for effects:** labels, defaults, fields, ranges, validation |
| `shortcuts.js` | Keyboard shortcut registry (also feeds the help dialog) |
| `tags.js` | Built-in annotation tags by category |
| `annotationColours.js` | The 8-colour annotation palette |
| `userColour.js` | Stable colour per user id |
| `regionMenuItem.js` | Builds right-click menu items |

## `e2e/`

Playwright specs: `login`, `upload`, `player`, `annotations`, `effects`, `collaboration`, plus `helpers.js` (generates a test WAV and mocks R2 in the browser). Excluded from Meteor builds via `.meteorignore`.

## Generated and framework-managed

Don't edit by hand:

| Path | What it is |
| ---- | ---------- |
| `node_modules/` | npm dependencies |
| `_build/`, `.rsdoctor/` | Rspack build output and analysis |
| `playwright-report/`, `test-results/`, `blob-report/` | Playwright output |
| `.meteor/local/` | Meteor's local build and dev database |
| `.meteor/packages`, `.meteor/versions`, `.meteor/release` | Edited via `meteor add`/`remove`/`update`; commit these |

## Conventions

- **Tests sit beside the code** they cover as `*.test.js` or `*.test.jsx`.
- **Import server modules from `server/main.js`.** A new methods or publications file does nothing until it is imported there.
- **Names:** React components in `PascalCase.jsx`, hooks as `useThing.js`, API files as `<domain>Collection|Methods|Publications.js`.
