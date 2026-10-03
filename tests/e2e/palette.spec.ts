import type { Page } from '@playwright/test';
import { BLOCK_STORAGE, expect, test } from './fixtures';
import { allPaths } from './routes';
import { localizedPath } from '../../src/lib/i18n';
import { LANG_KEY } from '../../src/lib/storage';

const hydrated = (page: Page) =>
  expect(page.locator('astro-island[component-url*="CommandPalette"]:not([ssr])')).toBeAttached();
const dialog = (page: Page) => page.locator('dialog.palette');
const input = (page: Page) => dialog(page).getByRole('combobox');
const options = (page: Page) => dialog(page).getByRole('option');

async function open(page: Page) {
  await hydrated(page);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(dialog(page)).toBeVisible();
}

test('Ctrl/⌘+K opens a combobox palette; Enter navigates to the match', async ({ page }) => {
  await page.goto('/zh');
  await open(page);
  await expect(input(page)).toBeFocused();
  await expect(input(page)).toHaveAttribute('aria-expanded', 'true');
  const listId = (await input(page).getAttribute('aria-controls'))!;
  await expect(page.locator(`[id="${listId}"]`)).toHaveAttribute('role', 'listbox');
  const firstId = (await options(page).first().getAttribute('id'))!;
  await expect(input(page)).toHaveAttribute('aria-activedescendant', firstId);
  await expect(options(page).first()).toHaveAttribute('aria-selected', 'true');
  await input(page).fill('chip');
  await expect(options(page).first()).toContainText('ChipPot');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/zh\/work\/chippot$/);
  await expect(dialog(page)).toBeHidden();
});

test('arrow keys move the active option and wrap', async ({ page }) => {
  await page.goto('/en');
  await open(page);
  await page.keyboard.press('ArrowDown');
  const second = options(page).nth(1);
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(input(page)).toHaveAttribute('aria-activedescendant', (await second.getAttribute('id'))!);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(options(page).last()).toHaveAttribute('aria-selected', 'true');
});

test('Esc closes and returns focus to the trigger', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the nav ⌘K trigger is a fine-pointer affordance');
  await page.goto('/en');
  await hydrated(page);
  const trigger = page.locator('.site-nav [data-palette-open]');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('slash opens; slash while typing inserts the character', async ({ page }) => {
  await page.goto('/en');
  await hydrated(page);
  await page.keyboard.press('/');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.type('a/b');
  await expect(input(page)).toHaveValue('a/b');
  await expect(dialog(page)).toBeVisible();
});

test('toggle closes: Ctrl/⌘+K while open closes it', async ({ page }) => {
  await page.goto('/en');
  await open(page);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(dialog(page)).toBeHidden();
});

test('focus is trapped inside the open palette', async ({ page }) => {
  await page.goto('/en');
  await open(page);
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  await expect(input(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(input(page)).toBeFocused();
});

test('switch language keeps the current page and remembers the choice', async ({ page }) => {
  await page.goto('/zh/work/chippot');
  await open(page);
  await input(page).fill('english');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/en\/work\/chippot$/);
  expect(await page.evaluate((k) => localStorage.getItem(k), LANG_KEY)).toBe('en');
});

test('switch language with storage blocked still works', async ({ page }) => {
  await page.addInitScript(BLOCK_STORAGE);
  await page.goto('/zh/work/ntutbox');
  await open(page);
  await input(page).fill('english');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/en\/work\/ntutbox$/);
});

test('copy email', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'clipboard permission is desktop-only in this setup');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/en');
  await open(page);
  await input(page).fill('copy email');
  await page.keyboard.press('Enter');
  await expect(dialog(page).locator('.palette-status')).toHaveText('Email copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('poter.pan@panspace.me');
});

test('touch: a floating button opens the palette; desktop: it is not shown', async ({ page }, info) => {
  await page.goto('/zh');
  await hydrated(page);
  const fab = page.locator('.palette-fab');
  if (info.project.name === 'mobile') {
    await expect(fab).toBeVisible();
    await fab.tap();
    await expect(dialog(page)).toBeVisible();
  } else {
    await expect(fab).toBeHidden();
  }
});

test('reduced motion: opens without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  await open(page);
  expect(await dialog(page).evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
});

test('available on every page', async ({ page }) => {
  for (const path of allPaths()) {
    await page.goto(localizedPath('en', path));
    await open(page);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('no dead triggers are shown', async ({ page }) => {
    await page.goto('/zh');
    await expect(page.locator('[data-palette-open]')).toBeHidden();
    await expect(page.locator('.palette-fab')).toBeHidden();
  });
});
