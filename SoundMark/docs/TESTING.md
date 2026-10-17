# Testing

SoundMark has three layers of automated checks, all run in CI on every push and pull request to `main` and `dev`.

| Layer | Tool | Where | Command |
| ----- | ---- | ----- | ------- |
| Lint | ESLint 9 | whole project | `npm run lint` |
| Unit and integration | Mocha via `meteortesting:mocha`, Chai, Sinon, Testing Library | `*.test.js(x)` beside source | `npm run test:ci` |
| End to end | Playwright (Chromium) | `e2e/` | `npm run test:e2e` |

Run everything from the `SoundMark/` directory.

## Lint

```bash
npm run lint        # report problems
npm run lint:fix    # auto-fix what can be fixed
```

Config is in `eslint.config.mjs`: ESLint recommended rules plus React and React Hooks rules. Unused variables warn unless prefixed with `_`. A few rules (`react-hooks/set-state-in-effect`, `react-hooks/refs`, `no-undef`) are currently warnings, with a TODO in the config to tighten them.

## Unit and integration tests

Meteor runs these in two environments at once:

- **Server tests** (`tests/server.js`) load every `imports/**/*.test.js` file. These cover methods, publications, session and presence logic, and the guest login handler.
- **Client tests** (`tests/client.js`) load every `imports/ui/**/*.test.js(x)` file in a headless browser. These cover components, hooks, services, and audio utilities.

```bash
npm run test:ci     # run once, no settings file needed (what CI uses)
npm test            # run once, with private/settings.json
npm run test-app    # watch mode, full-app (TEST_WATCH=1)
```

**Running client tests locally** needs a headless browser driver. If Meteor can't launch one, set the same variables CI does:

```bash
export TEST_BROWSER_DRIVER=puppeteer
export TEST_BROWSER_DRIVER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"
export PUPPETEER_EXECUTABLE_PATH=/path/to/chrome   # e.g. /usr/bin/google-chrome
```

### Writing tests

- Put the test next to the file it covers: `thing.js` → `thing.test.js`.
- Server tests are wrapped in `if (Meteor.isServer)`. They call a method by invoking its handler with a fake `this`, and test publications with `PublicationCollector`:

  ```js
  import { PublicationCollector } from "meteor/communitypackages:publication-collector";

  // Methods: pass the calling user as `this.userId`
  await Meteor.server.method_handlers["effects.create"].apply({ userId }, [args]);

  // Publications
  const collector = new PublicationCollector({ userId });
  const collections = await collector.collect("effects.forFile", fileId);
  // collections.effects is the array of published effect docs
  ```

- Never hit R2 from a test. Stub `R2.r2Client.send` and `R2.r2Helpers.getSignedUrl` (imported as `import * as R2 from "./r2"`) with `sinon`, and call `sinon.restore()` in `afterEach`. `r2Helpers` exists specifically so `getSignedUrl` can be stubbed.
- React tests use `@testing-library/react` and `@testing-library/user-event`.
- Pure logic (`utils/`, `lib/`) needs no mocking. Prefer testing there where you can.

## End-to-end tests

Playwright drives a real browser against a running app.

```bash
npm run test:e2e        # headless
npm run test:e2e:ui     # interactive UI mode, good for debugging
npx playwright show-report   # open the last HTML report
```

`playwright.config.js` starts the app with `npm run dev` and waits for <http://localhost:3000> (up to 5 minutes for a cold build). Locally it **reuses** an app you already have running; in CI it always starts a fresh one.

**First time only:** `npx playwright install chromium`.

### R2 is mocked

The e2e tests never contact real storage. `e2e/helpers.js` intercepts requests to `*.r2.cloudflarestorage.com` in the browser, serves a generated sine-wave WAV (`makeWav`), and adds the CORS headers. The server still needs *some* R2 settings to start, so placeholder values work:

```json
{
  "public": { "packages": { "accounts": { "clientStorage": "session" } } },
  "private": {
    "r2": {
      "accountId": "placeholder",
      "accessKeyId": "placeholder",
      "secretAccessKey": "placeholder",
      "bucketName": "placeholder"
    }
  }
}
```

### What's covered

| Spec | Scenarios |
| ---- | --------- |
| `login.spec.js` | Redirect when unnamed; Continue disabled until a name is typed; guest reaches upload page |
| `upload.spec.js` | Rename from upload page; non-audio file rejected; upload opens player as host; failed storage upload shows an error |
| `player.spec.js` | Unknown session shows "ended" screen; play button and <kbd>K</kbd>; speed validation; share copies link |
| `annotations.spec.js` | Create with tag and comment; end-before-start rejected; edit and delete; filter by tag |
| `effects.spec.js` | Error without a selection; apply to a region; out-of-range parameters rejected |
| `collaboration.spec.js` | Collaborator joins via link and sees live changes; session ends for everyone when host closes their tab |

Collaboration tests open a second browser context, which works because guest identity lives in `sessionStorage` (each context is a separate guest).

Playwright output (`playwright-report/`, `test-results/`) is gitignored and excluded from Meteor's file watcher, so test runs don't rebuild the app.

## Continuous integration

`.github/workflows/ci.yml` defines two parallel jobs on Ubuntu with Node 22:

**`test`: Unit and integration**
1. Install headless Chrome and Meteor.
2. `meteor npm ci` (with `PUPPETEER_SKIP_DOWNLOAD=true`).
3. `npm run lint`
4. `npm run test:ci` with the Puppeteer driver variables above.

**`e2e`: Playwright** (30-minute timeout)
1. Install Meteor and dependencies, then `npx playwright install --with-deps chromium`.
2. Write placeholder `private/settings.json`.
3. `npm run test:e2e` (2 retries on CI, one worker).
4. Upload `playwright-report/` as an artifact, kept for 14 days.

A pull request should pass both before merging.

## Troubleshooting

**Client tests hang or can't start a browser.** Set the `TEST_BROWSER_DRIVER*` variables above and make sure Chrome is installed.

**E2E times out waiting for the server.** The first Meteor build is slow. Start `npm run dev` yourself in another terminal and let Playwright reuse it.

**E2E fails with port errors.** Another process is on port 3000, and the config expects exactly that port.

**Flaky e2e in CI.** Download the `playwright-report` artifact and open the trace for the retried test (`trace: on-first-retry`).
