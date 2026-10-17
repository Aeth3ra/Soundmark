// @ts-check
import { expect } from '@playwright/test';

// Presigned R2 URLs look like https://<account>.r2.cloudflarestorage.com/...
const STORAGE_URL = /\.r2\.cloudflarestorage\.com\//;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

/**
 * Builds a mono 16-bit PCM WAV file containing a sine tone.
 * @param {number} seconds
 * @returns {Buffer}
 */
export function makeWav(seconds = 4) {
  const sampleRate = 8000;
  const samples = sampleRate * seconds;
  const buffer = Buffer.alloc(44 + samples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples * 2, 40);

  for (let i = 0; i < samples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return buffer;
}

/**
 * Stands in for Cloudflare R2 so tests never touch the real bucket.
 * Uploads (PUT) succeed with `uploadStatus`, and downloads (GET) return a test tone.
 * @param {import('@playwright/test').BrowserContext} context
 */
export async function mockStorage(context, { uploadStatus = 200 } = {}) {
  const wav = makeWav();
  await context.route(STORAGE_URL, (route) => {
    const method = route.request().method();
    if (method === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    if (method === 'PUT') {
      return route.fulfill({ status: uploadStatus, headers: CORS_HEADERS });
    }
    return route.fulfill({
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'audio/wav' },
      body: wav,
    });
  });
}

/**
 * Fills in the login form the page is already on.
 * @param {import('@playwright/test').Page} page
 */
export async function enterName(page, name) {
  await page.getByPlaceholder('e.g. Alice').fill(name);
  await page.getByRole('button', { name: 'Continue' }).click();
}

/**
 * Starts a new guest session and lands on the upload page.
 * @param {import('@playwright/test').Page} page
 */
export async function loginAsGuest(page, name = 'Alice') {
  await page.goto('/login');
  await enterName(page, name);
  await expect(page).toHaveURL('/');
}

/**
 * Uploads a generated test tone from the upload page and waits for the player.
 * Requires `mockStorage` on the page's context.
 * @param {import('@playwright/test').Page} page
 */
export async function uploadAudio(page) {
  await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({
    name: 'test-tone.wav',
    mimeType: 'audio/wav',
    buffer: makeWav(),
  });
  await expect(page).toHaveURL(/\/player\/[^/]+$/);
}

/**
 * The player controls stay disabled until the audio is decoded and rendered.
 * @param {import('@playwright/test').Page} page
 */
export async function waitForAudioReady(page) {
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled({
    timeout: 15_000,
  });
}

/**
 * Logs in, uploads the test tone, and waits until the player is usable.
 * @param {import('@playwright/test').Page} page
 */
export async function openPlayerWithAudio(page, name = 'Alice') {
  await mockStorage(page.context());
  await loginAsGuest(page, name);
  await uploadAudio(page);
  await waitForAudioReady(page);
}

/**
 * Drags across the waveform between two fractions of its width to select a region.
 * @param {import('@playwright/test').Page} page
 */
export async function selectRegion(page, from = 0.2, to = 0.6) {
  const box = await page.getByTestId('waveform').boundingBox();
  if (!box) throw new Error('Waveform is not visible');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * from, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * to, y, { steps: 10 });
  await page.mouse.up();
}
