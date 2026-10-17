// @ts-check
import { test, expect } from '@playwright/test';
import { openPlayerWithAudio } from './helpers';

test.beforeEach(async ({ page }) => {
  await openPlayerWithAudio(page, 'Alice');
  await page.getByRole('button', { name: 'Toggle annotations panel' }).click();
});

/**
 * Opens the new annotation form from the panel, fills it in and saves.
 * @param {import('@playwright/test').Page} page
 */
async function createAnnotation(page, { title, tag, comment }) {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'New annotation' });
  await form.getByRole('textbox', { name: 'Title' }).fill(title);
  if (tag) await form.getByRole('button', { name: tag, exact: true }).click();
  if (comment) await form.getByPlaceholder('Add a comment (optional)').fill(comment);
  await form.getByRole('button', { name: 'Save annotation' }).click();
  await expect(form).toBeHidden();
}

test('create an annotation with a tag and comment', async ({ page }) => {
  await createAnnotation(page, { title: 'Main hook', tag: 'Chorus', comment: 'Louder here' });

  const card = page.getByRole('listitem').filter({ hasText: 'Main hook' });
  await expect(card).toContainText('Chorus');
  await expect(card).toContainText('Louder here');
  await expect(card).toContainText('Alice');
  await expect(page.getByRole('button', { name: 'Toggle annotations panel' })).toContainText('1');
});

test('end time before start time is rejected', async ({ page }) => {
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'New annotation' });

  await form.getByRole('textbox', { name: 'Start' }).fill('0:02');
  await form.getByRole('textbox', { name: 'End (optional)' }).fill('0:01');
  await form.getByRole('button', { name: 'Save annotation' }).click();

  await expect(form.getByRole('alert')).toHaveText('End time must be after the start time.');
});

test('edit and delete an annotation', async ({ page }) => {
  await createAnnotation(page, { title: 'First take' });

  await page.getByTitle('Edit annotation').click();
  const form = page.getByRole('dialog', { name: 'Edit annotation' });
  await form.getByRole('textbox', { name: 'Title' }).fill('Second take');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(form).toBeHidden();
  await expect(page.getByRole('listitem').filter({ hasText: 'Second take' })).toBeVisible();

  await page.getByTitle('Delete annotation').click();
  await expect(page.getByText('No annotations yet.')).toBeVisible();
});

test('filter annotations by tag', async ({ page }) => {
  await createAnnotation(page, { title: 'Opening', tag: 'Intro' });
  await createAnnotation(page, { title: 'Big moment', tag: 'Drop' });

  const list = page.getByRole('list').filter({ has: page.getByRole('listitem') });
  await expect(list.getByRole('listitem')).toHaveCount(2);

  await page.getByRole('button', { name: 'Drop', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Big moment');

  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(2);
});
