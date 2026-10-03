import { BLOCK_STORAGE, expect, test } from './fixtures';
import { BOOT_KEY } from '../../src/lib/storage';

test.describe('boot sequence', () => {
  test.use({ bootSeen: false });

  test('plays on first visit, finishes within 2.5 s, and is remembered', async ({ page }) => {
    await page.goto('/zh');
    await expect(page.locator('html')).toHaveAttribute('data-boot', /play|folding/);
    await expect(page.locator('#boot')).toBeVisible();
    await expect(page.locator('.bento-hero h1')).toBeAttached(); // real content already in the DOM
    const started = Date.now();
    await expect(page.locator('#boot')).toBeHidden({ timeout: 4000 });
    expect(Date.now() - started).toBeLessThan(2600);
    expect(await page.evaluate((k) => localStorage.getItem(k), BOOT_KEY)).toBe('1');
    await page.reload();
    await expect(page.locator('#boot')).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-boot', /play/);
  });

  test('any key skips immediately', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('#boot')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.locator('#boot')).toBeHidden({ timeout: 300 });
  });

  test('a click skips immediately', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('#boot')).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.locator('#boot')).toBeHidden({ timeout: 300 });
  });

  test('plays after the root language redirect', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(zh|en)$/);
    await expect(page.locator('html')).toHaveAttribute('data-boot', /play|folding/);
  });

  test('does not play under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh');
    await expect(page.locator('#boot')).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-boot', /play/);
  });

  test('does not play when arriving from another page of the site', async ({ page, baseURL }) => {
    await page.goto('/zh', { referer: `${baseURL}/zh/work` });
    await expect(page.locator('#boot')).toBeHidden();
  });

  test('storage blocked: treated as seen, no boot', async ({ page }) => {
    await page.addInitScript(BLOCK_STORAGE);
    await page.goto('/zh');
    await expect(page.locator('#boot')).toBeHidden();
    await expect(page.locator('.bento-hero h1')).toBeVisible();
  });
});
