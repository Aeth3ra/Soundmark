// @ts-check
import { test, expect } from '@playwright/test';
import { enterName, mockStorage, openPlayerWithAudio, waitForAudioReady } from './helpers';

// Two separate browser contexts act as two different people sharing one session.
test('a collaborator joins via the shared link and sees changes live', async ({ page: host, browser }) => {
  await openPlayerWithAudio(host, 'Alice');
  const sessionUrl = host.url();

  const guestContext = await browser.newContext();
  await mockStorage(guestContext);
  const guest = await guestContext.newPage();

  // A new visitor is sent to login first, then back to the session they opened.
  await guest.goto(sessionUrl);
  await expect(guest).toHaveURL('/login');
  await enterName(guest, 'Bob');
  await expect(guest).toHaveURL(sessionUrl);
  await waitForAudioReady(guest);
  await expect(guest.getByText("You're hosting")).toBeHidden();

  // The host's annotation appears for the guest without a reload.
  await host.getByRole('button', { name: 'Toggle annotations panel' }).click();
  await host.getByRole('button', { name: 'Add', exact: true }).click();
  const form = host.getByRole('dialog', { name: 'New annotation' });
  await form.getByRole('textbox', { name: 'Title' }).fill('Check this bit');
  await form.getByRole('button', { name: 'Save annotation' }).click();

  await guest.getByRole('button', { name: 'Toggle annotations panel' }).click();
  const card = guest.getByRole('listitem').filter({ hasText: 'Check this bit' });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Alice');

  await guestContext.close();
});

test('the session ends for everyone when the host closes their tab', async ({ page: host, browser }) => {
  await openPlayerWithAudio(host, 'Alice');
  const sessionUrl = host.url();

  const guestContext = await browser.newContext();
  await mockStorage(guestContext);
  const guest = await guestContext.newPage();
  await guest.goto(sessionUrl);
  await enterName(guest, 'Bob');
  await waitForAudioReady(guest);

  await host.close();

  // The server can take ~15s to notice a closed tab's connection has dropped.
  await expect(guest).toHaveURL('/', { timeout: 30_000 });
  await expect(guest.getByText('The host ended the session.')).toBeVisible();

  await guestContext.close();
});
