# Setup Guide

How to install, configure, and run SoundMark locally.

## Prerequisites

| Tool | Version | Notes |
| ---- | ------- | ----- |
| [Meteor](https://docs.meteor.com/about/install.html) | 3.5.x | The project pins `METEOR@3.5.1` in `.meteor/release` |
| Node.js | 22 | What CI uses. Meteor also bundles its own Node for the app itself |
| Git | any | |
| Cloudflare R2 bucket | n/a | Audio storage. A free-tier bucket is fine for development |

MongoDB does **not** need to be installed. Meteor starts a local development database automatically.

## 1. Get the code

```bash
git clone https://github.com/Aeth3ra/Soundmark.git
cd Soundmark/SoundMark
```

The repository root contains only the README, CI config, and the `SoundMark/` folder. **All commands below run from `SoundMark/`.**

## 2. Install dependencies

```bash
meteor npm install
```

Use `meteor npm` rather than plain `npm` so that packages are built against Meteor's bundled Node version.

## 3. Create a Cloudflare R2 bucket

1. In the Cloudflare dashboard, go to **R2** and create a bucket.
2. Under **Manage R2 API Tokens**, create a token with **Object Read & Write** permission for that bucket. Note the **Access Key ID** and **Secret Access Key**.
3. Note your **Account ID** (shown on the R2 overview page).

### Configure CORS on the bucket

The browser uploads to and downloads from R2 directly using presigned URLs, so the bucket must allow cross-origin requests from your app. In the bucket's **Settings → CORS policy**, add something like:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Add your deployed origin to `AllowedOrigins` when you deploy. Without CORS you will see uploads fail in the browser console even though the credentials are correct.

## 4. Create the settings file

Create `private/settings.json` inside `SoundMark/`. The `private/` folder is gitignored (`SoundMark/private/*`), so credentials won't be committed.

```bash
mkdir -p private
```

```json
{
  "public": {
    "packages": {
      "accounts": {
        "clientStorage": "session"
      }
    }
  },
  "private": {
    "r2": {
      "accountId": "<your-cloudflare-account-id>",
      "accessKeyId": "<your-r2-access-key-id>",
      "secretAccessKey": "<your-r2-secret-access-key>",
      "bucketName": "<your-bucket-name>"
    }
  }
}
```

| Key | Purpose |
| --- | ------- |
| `private.r2.*` | Read by `imports/api/audio/r2.js` on the server only. Never sent to the client |
| `public.packages.accounts.clientStorage` | `"session"` stores the guest login token in `sessionStorage`, so each browser tab is its own guest. This is what makes testing collaboration with several tabs easy |

> **Important:** the R2 values must be nested under `"private"`. The server reads `Meteor.settings.private.r2`. Credentials placed at the top level of the file are ignored.

Never commit real credentials. If you accidentally do, rotate the R2 token immediately.

## 5. Run the app

```bash
npm run dev
```

This runs `meteor run --settings private/settings.json`. The first build can take a minute or two. When it finishes, open <http://localhost:3000>.

`npm start` runs plain `meteor run` **without** settings. The app will load, but uploading and playback won't work.

### First run checklist

1. You are redirected to `/login`. Enter a display name and continue.
2. Drop an audio file on the upload page. You land on `/player/<fileId>` as host.
3. Click **Share session**, paste the link into a second tab (or another browser), choose a different name, and confirm you both appear in the header.

## Development workflow

- Meteor rebuilds automatically on save, and client changes hot-reload.
- Run `npm run lint` before pushing. CI will reject lint errors.
- Run `npm run test:ci` for the unit and integration suite and `npm run test:e2e` for end-to-end tests. See [TESTING.md](./TESTING.md).
- To wipe the local database: stop the app and run `meteor reset`. This only affects the local dev database, not R2.

## Troubleshooting

**Uploads fail, or the console shows a CORS error.**
Check the bucket's CORS policy (step 3) includes your origin and the `PUT` method.

**Requests go to `https://undefined.r2.cloudflarestorage.com`.**
The settings weren't loaded. Start with `npm run dev`, and check that `r2` sits under `private` in the settings file.

**`meteor: command not found`.**
Install Meteor and reopen your terminal. Verify with `meteor --version`.

**Dependency or build errors after switching branches.**
```bash
rm -rf node_modules
meteor npm install
```
If that doesn't help, remove the build cache with `rm -rf _build` and restart.

**"This session has ended" when opening a link.**
The host left, or the session's audio no longer exists. Sessions are not persistent. See [ARCHITECTURE.md](./ARCHITECTURE.md#sessions-and-hosts).

**Port 3000 already in use.**
Run `meteor run --settings private/settings.json --port 3001`. Note that the Playwright config expects port 3000.

**Playwright can't find a browser.**
`npx playwright install chromium`

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md): how storage and the server interact
- [TESTING.md](./TESTING.md): running tests
- [FILE_STRUCTURE.md](./FILE_STRUCTURE.md): where code lives
