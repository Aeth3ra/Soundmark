# API Reference

Server-side Meteor methods, publications, and collections. Source lives in `imports/api/<domain>/`.

Call methods from the client with `Meteor.callAsync("name", ...args)`, normally through a function in `imports/ui/services/`. Errors are thrown as `Meteor.Error(code, reason)`.

## Collections

| Export | Mongo collection | File |
| ------ | ---------------- | ---- |
| `AudioCollection` | `audioFiles` | `audio/audioCollection.js` |
| `AnnotationsCollection` | `annotations` | `annotations/annotationsCollection.js` |
| `EffectsCollection` | `effects` | `effects/effectsCollection.js` |
| `PresenceCollection` | `presence` | `presences/presenceCollection.js` |
| `SessionsCollection` | `sessions` | `sessions/sessionCollection.js` |
| `Meteor.users` | `users` | Meteor accounts |

### Document shapes

```js
// audioFiles
{ _id, key, fileName, contentType, status: "pending", createdAt }
// key = "audio/<randomId>-<filename>" (R2 object key)

// annotations
{ _id, fileId, title, colour, start, end /* number | null */,
  tags: [String], comment, createdBy, createdAt, updatedAt }
// end === null means a single timestamp rather than a region

// effects
{ _id, fileId, type, start, end, params, enabled, order,
  createdBy, createdAt, updatedAt }

// presence
{ _id, fileId, userId, name, position, isPlaying,
  followingUserId /* string | null */, playbackRate, connectionId, updatedAt }

// sessions: _id is the fileId
{ _id: fileId, hostId, createdAt }

// users (relevant fields)
{ _id, guest: true, profile: { name }, createdAt }
```

Times are in **seconds** from the start of the audio.

## Methods

### Audio (`audio/audioMethods.js`)

| Method | Arguments | Returns | Notes |
| ------ | --------- | ------- | ----- |
| `audio.getUploadUrl` | `filename: string`, `contentType: string` | `{ uploadUrl, fileId }` | Creates the `audioFiles` record and a presigned PUT URL valid for 300 s |
| `audio.getDownloadUrl` | `fileId` | `string` (URL) | Presigned GET URL, 300 s. Throws `file-not-found` |
| `audio.getExportInfo` | `fileId` | `{ url, fileName }` | Presigned GET URL for exporting. Throws `not-found` |
| `audio.deleteFile` | `fileId` | n/a | Calls `deleteAudioFile`: deletes the R2 object, the Mongo record, and the file's annotations and effects. No-op if already gone |

### Annotations (`annotations/annotationsMethods.js`)

| Method | Arguments | Notes |
| ------ | --------- | ----- |
| `annotations.create` | `{ fileId, title = "", colour = "", start, end = null, tags = [], comment = "" }` | Login required. Returns the new id. `createdBy` is always the caller |
| `annotations.update` | `annotationId`, `{ title, colour, tags, comment, start, end }` | Login required. All six fields are required |
| `annotations.delete` | `annotationId` | No-op if missing |

Validation on create: `start` finite and ≥ 0; if `end` is set, it must be finite and `> start`; when the audio record has `durationSeconds`, neither may exceed it. Error code: `invalid-time`. Other codes: `not-authorized`, `audio-not-found`, `annotation-not-found`.

### Effects (`effects/effectsMethods.js`)

| Method | Arguments | Notes |
| ------ | --------- | ----- |
| `effects.create` | `{ fileId, type, start, end, params, enabled = true, order = 0 }` | Login required. Returns the new id |
| `effects.update` | `effectId`, `{ start, end, params, enabled, order }` | Creator or session host only. `type` can't change |
| `effects.delete` | `effectId` | Creator or session host only. No-op if missing |

Common validation: `0 ≤ start < end`, `order` a non-negative safe integer, `end` within duration when known.

Per-type `params`:

| `type` | `params` | Range |
| ------ | -------- | ----- |
| `normalize` | `{ targetPeakDb: Number }` | −6 to 0 |
| `amplify` | `{ gainDb: Number }` | −24 to +24 |
| `pitchShift` | `{ semitones: Number }` | −24 to +24 |
| `filter` | `{ filterType: "lowpass" \| "highpass", frequency: Number }` | 1 to 24000 Hz |

Error codes: `invalid-time`, `invalid-order`, `invalid-params`, `invalid-effect` (unknown type), `not-authorized`, `audio-not-found`, `effect-not-found`.

### Presence (`presences/presenceMethods.js`)

| Method | Arguments | Notes |
| ------ | --------- | ----- |
| `presence.update` | `{ fileId, position, isPlaying?, followingUserId?, playbackRate? }` | Login required. Upserts the caller's presence. Creates the session (caller becomes host) if the room is brand new. Ignored if the session ended but others are still present |
| `presence.leave` | `{ fileId }` | Removes the caller's presence. **If the caller is host, ends the session** |

The server also runs a 15 s sweep that removes presence older than 5 minutes with no live connection, and a `connection.onClose` hook that cleans up when a connection actually closes. See [ARCHITECTURE.md](./ARCHITECTURE.md#presence-cleanup).

### Users (`users/userMethods.js`)

| Method | Arguments | Returns | Notes |
| ------ | --------- | ------- | ----- |
| `user.setDisplayName` | `name: string` | n/a | Login required. Trimmed; empty throws `invalid-name` |
| `user.get` | none | `string \| null` | Caller's display name |

### Misc

| Method | Notes |
| ------ | ----- |
| `about` | Template leftover in `server/main.js`; returns a string with a random id. Safe to remove |

## Publications

| Publication | Arguments | Returns | Login required |
| ----------- | --------- | ------- | :------------: |
| `annotations.forFile` | `fileId` | Annotations for the file | Yes (empty otherwise) |
| `annotations.authorsForFile` | `fileId` | Composite: annotation `createdBy` fields plus each author's `profile.name`. Reactive to new authors | No |
| `effects.forFile` | `fileId` | Effects for the file | Yes (empty otherwise) |
| `presence.forFile` | `fileId` | Presence docs for the file | No |
| `sessions.forFile` | `fileId` | The session doc (`_id === fileId`) | No |

`annotations.authorsForFile` uses `reywood:publish-composite` so that author names stay subscribed only while that author has annotations on the file.

## Login handler

`users/guestLoginHandler.js` registers a `"guest"` handler with `Accounts.registerLoginHandler`. Calling the login method with `{ guest: true }` creates a user (`guest: true`), generates a stamped login token, and returns `{ userId, token }`. On the client this is wrapped by `services/guestLogin.js` and used by `hooks/useGuestAccount.js`.

## Server exports used across domains

| Function | File | Purpose |
| -------- | ---- | ------- |
| `createSessionIfNeeded(fileId, hostId)` | `sessions/sessionMethods.js` | Insert session; ignores duplicate-key races |
| `isHost(fileId, userId)` | `sessions/sessionMethods.js` | Host check used by effects permissions |
| `endSession(fileId)` | `sessions/sessionMethods.js` | Removes session, presence, and the audio file with its annotations and effects |
| `deleteAudioFile(fileId)` | `audio/audioMethods.js` | Deletes the R2 object, Mongo record, annotations, and effects |
| `cleanupStalePresence()` | `presences/presenceMethods.js` | The sweep body (exported for tests) |
