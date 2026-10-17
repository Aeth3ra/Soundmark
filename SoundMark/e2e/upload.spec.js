// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsGuest, mockStorage, uploadAudio, waitForAudioReady } from './helpers';

test('guest can rename themselves from the upload page', async ({ page }) => {
  await loginAsGuest(page, 'Alice');

  await page.getByRole('button', { name: 'Edit your name' }).click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Bob');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('button', { name: 'Edit your name' })).toHaveText('Bob');

  // The new name is saved on the server, not just in the page.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Edit your name' })).toHaveText('Bob');
});

test('uploading a non-audio file shows an error', async ({ page }) => {
  await loginAsGuest(page);

  await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not audio'),
  });

  await expect(page.getByText('Please choose an audio file')).toBeVisible();
  await expect(page).toHaveURL('/');
});

test('uploading audio opens the player as host', async ({ page, context }) => {
  await mockStorage(context);
  await loginAsGuest(page);

  await uploadAudio(page);
  await waitForAudioReady(page);

  await expect(page.getByText("You're hosting")).toBeVisible();
  // The generated test tone is 4 seconds long.
  await expect(page.getByText('0:00 / 0:04')).toBeVisible();
});

test('a failed storage upload shows an error and stays on the upload page', async ({ page, context }) => {
  await mockStorage(context, { uploadStatus: 500 });
  await loginAsGuest(page);

  await page.locator('input[type="file"][accept="audio/*"]').setInputFiles({
    name: 'test-tone.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from('RIFF'),
  });

  await expect(page.getByText('Upload failed. Please try again.')).toBeVisible();
  await expect(page).toHaveURL('/');
});
