// @ts-check
import { test, expect } from '@playwright/test';
import { loginAsGuest, openPlayerWithAudio } from './helpers';

test('opening a session that does not exist shows the ended screen', async ({ page }) => {
  await loginAsGuest(page);

  await page.goto('/player/doesNotExist123');

  await expect(page.getByRole('heading', { name: 'This session has ended' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to home' }).click();
  await expect(page).toHaveURL('/');
});

test.describe('with audio loaded', () => {
  test.beforeEach(async ({ page }) => {
    await openPlayerWithAudio(page);
  });

  test('play button and K shortcut toggle playback', async ({ page }) => {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

    await page.keyboard.press('k');
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  });

  test('playback speed accepts valid values and rejects invalid ones', async ({ page }) => {
    const speedInput = page.getByRole('textbox', { name: 'Set playback speed' });
    const currentSpeed = page.getByLabel('Current playback speed');

    await speedInput.fill('2');
    await speedInput.press('Enter');
    await expect(currentSpeed).toHaveText('2×');

    await speedInput.fill('100');
    await speedInput.press('Enter');
    await expect(page.getByText('That playback speed is not allowed')).toBeVisible();
    await expect(currentSpeed).toHaveText('2×');
  });

  test('share button copies the session link', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.getByRole('button', { name: 'Share session' }).click();

    await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(page.url());
  });
});
