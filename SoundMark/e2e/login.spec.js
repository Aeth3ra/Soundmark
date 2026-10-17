// @ts-check
import { test, expect } from '@playwright/test';

// Each test gets a fresh browser context, so every test starts as a new guest
// with no display name.

test('visitor without a name is redirected to login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL('/login');
  await expect(page.getByText('Enter your name')).toBeVisible();
});

test('continue is disabled until a name is entered', async ({ page }) => {
  await page.goto('/login');
  const nameInput = page.getByPlaceholder('e.g. Alice');
  const continueButton = page.getByRole('button', { name: 'Continue' });

  await expect(continueButton).toBeDisabled();

  await nameInput.fill('   ');
  await expect(continueButton).toBeDisabled();

  await nameInput.fill('Alice');
  await expect(continueButton).toBeEnabled();
});

test('guest can enter a name and reach the upload page', async ({ page }) => {
  await page.goto('/login');

  await page.getByPlaceholder('e.g. Alice').fill('Alice');
  // Waits out the "Connecting…" state, since click() waits for the button to be enabled.
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByText('Welcome,')).toBeVisible();
  await expect(page.getByText('Alice')).toBeVisible();
  await expect(page.getByText('Drag an audio file here')).toBeVisible();
});
