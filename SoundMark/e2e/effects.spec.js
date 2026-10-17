// @ts-check
import { test, expect } from '@playwright/test';
import { openPlayerWithAudio, selectRegion } from './helpers';

test.beforeEach(async ({ page }) => {
  await openPlayerWithAudio(page);
  await page.getByRole('button', { name: 'Toggle effects panel' }).click();
});

test('applying an effect without a selected region shows an error', async ({ page }) => {
  await page.getByRole('button', { name: 'Apply', exact: true }).click();

  const toasts = page.getByRole('region', { name: 'Notification messages' });
  await expect(
    toasts.getByText('Select a region on the waveform before applying an effect.')
  ).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'New effect' })).toBeHidden();
});

test('select a region and apply an effect to it', async ({ page }) => {
  await selectRegion(page);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();

  const form = page.getByRole('dialog', { name: 'New effect' });
  await form.getByRole('button', { name: 'Save effect' }).click();
  await expect(form).toBeHidden();

  const effects = page.getByRole('complementary', { name: 'Audio effects' });
  await expect(effects).toContainText('Peak normalisation');
  await expect(effects).toContainText('Target peak: -1 dB');
  await expect(effects).toContainText('By you');
  await expect(page.getByRole('button', { name: 'Toggle effects panel' })).toContainText('1');
});

test('effect parameters out of range are rejected', async ({ page }) => {
  await selectRegion(page);
  await page.getByRole('button', { name: 'Apply', exact: true }).click();

  const form = page.getByRole('dialog', { name: 'New effect' });
  await form.getByLabel('Effect', { exact: true }).selectOption({ label: 'Low / high-pass filter' });
  await form.getByLabel('Cutoff frequency (Hz)').fill('0');
  await form.getByRole('button', { name: 'Save effect' }).click();

  await expect(form.getByRole('alert')).toContainText('between 1 and 24000 Hz');
});
