# SOUNDMARK Architecture

## Overview

SOUNDMARK is a web-based audio annotation application built using Meteor.js and React. The application separates the user interface from server-side application logic while using Meteor's communication mechanisms to synchronise data between clients and the server.

The main architectural components are:

- React client application
- Meteor server
- MongoDB database
- Cloudflare R2 object storage
- Browser-based audio processing
- Real-time collaboration

## Client

The client is implemented using React and is responsible for the user interface and browser-side audio functionality.

The main client responsibilities include:

- Rendering application pages and components
- Audio playback
- Waveform visualisation and interaction
- Creating and displaying annotations
- Applying browser-based audio processing
- Managing user interactions
- Displaying collaborative user presence

The main client code is located in:

```text
imports/ui/
```

## Server

Meteor provides the server-side application environment.

Server-side functionality includes:

- Database access
- Meteor methods
- Publications
- Annotation persistence
- Audio metadata persistence
- User and guest account handling
- Collaborative presence management
- Audio storage integration

Server-related application code is primarily located in:

```text
imports/api/
server/
```

## Data Layer

SOUNDMARK uses MongoDB through Meteor's collection system.

The main application collections include:

- Audio
- Annotations
- Presence

Each domain contains its collection alongside the relevant Meteor methods and publications.

For example:

```text
imports/api/annotations/
├── annotationsCollection.js
├── annotationsMethods.js
└── annotationsPublications.js
```

This organisation keeps database operations and server-side behaviour grouped by feature.

## Meteor Methods and Publications

Meteor Methods are used when the client needs to request a server-side operation, such as creating or updating application data.

Publications are used to provide reactive server data to clients.

This allows changes to shared application data to be reflected across connected users without requiring the client to repeatedly request the complete dataset.

## Audio Storage

Audio files are stored separately from MongoDB using Cloudflare R2.

MongoDB stores application metadata and references to uploaded audio, while R2 stores the actual audio files.

This separation prevents large audio files from being stored directly in the application database.

## Client-Side Audio Processing

Audio playback and processing are primarily performed in the browser.

SOUNDMARK uses:

- WaveSurfer.js for waveform visualisation and interaction
- Web Audio API for browser audio processing
- Tone.js for audio effects
- Meyda.js for audio analysis
- ffmpeg.wasm for client-side audio processing and conversion

This allows users to interact with audio without requiring every audio operation to be performed by the server.

## Real-Time Collaboration

SOUNDMARK supports multiple users working within the same workspace.

Collaborative functionality includes:

- User presence
- Shared annotations
- Updates to shared application state

Meteor's reactive data system is used to propagate relevant changes between the server and connected clients.
