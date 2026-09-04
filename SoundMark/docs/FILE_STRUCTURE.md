# SOUNDMARK File Structure

SOUNDMARK follows a Meteor.js application structure with React used for the client interface. Application code is primarily divided between the `imports/api` backend logic and `imports/ui` frontend logic.

## Directory Overview

```text
SOUNDMARK/
├── client/
├── imports/
│   ├── api/
│   └── ui/
├── server/
├── public/
├── private/
├── docs/
└── tests/
```

### `client/`

Contains the Meteor client entry point and global client configuration.

### `imports/api/`

Contains server-side application functionality organised by domain.

```text
api/
├── annotations/
├── audio/
├── presences/
└── users/
```

- **`annotations/`** — annotation MongoDB collection, methods, and publications.
- **`audio/`** — audio collection, audio-related methods, and Cloudflare R2 integration.
- **`presences/`** — collaborative user presence collection, methods, and publications.
- **`users/`** — guest account creation and user-related methods.

### `imports/ui/`

Contains the React frontend.

```text
ui/
├── components/
├── hooks/
├── lib/
├── pages/
├── services/
└── utils/
```

- **`components/`** — reusable interface components for audio, annotations, collaboration, and other UI functionality.
- **`hooks/`** — custom React hooks for waveform interaction, annotations, regions, presence, authentication, and zooming.
- **`lib/`** — shared frontend logic and configuration utilities.
- **`pages/`** — major application pages such as audio upload and the main player workspace.
- **`services/`** — frontend services used to communicate with Meteor methods and application APIs.
- **`utils/`** — general-purpose frontend utility functions.

### `server/`

Contains the Meteor server entry point and server startup configuration.

### `public/`

Contains static assets that can be accessed by the client.

### `private/`

Contains files that should not be directly accessible by the client, such as private application configuration.

### `docs/`

Contains technical and project documentation covering setup, architecture, features, annotations, audio processing, and collaboration.

### `tests/`

Contains automated tests for the application.

## Framework-Managed Directories

The following directories are not part of SOUNDMARK's application source structure:

- **`.meteor/`** — Meteor framework configuration and package management.
- **`node_modules/`** — installed npm dependencies.
- **`_build/`** — generated build output.

These directories are generally not modified directly during normal development.
