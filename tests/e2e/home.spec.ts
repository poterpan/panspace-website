import { existsSync } from 'node:fs';
import { expect, test } from './fixtures';
import { featuredSlugs } from './routes';

test.describe('homepage', () => {
  test('shows the hero and featured projects in featured order', async ({ page }) => {
    await page.goto('/zh');
    await expect(page.locator('.bento-hero h1')).toHaveText('Poter Pan');
    const hrefs = await page.locator('.project-card').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(featuredSlugs().slice(0, 5).map((s) => `/zh/work/${s}`));
  });

  test('every Bento card is a focusable link', async ({ page }) => {
    await page.goto('/en');
    const cards = page.locator('.bento a.bento-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < count; i++) {
      await cards.nth(i).focus();
      await expect(cards.nth(i)).toBeFocused();
    }
  });

  test('desktop grid: hero spans two columns and two rows', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop layout only');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/zh');
    const hero = (await page.locator('.bento-hero').boundingBox())!;
    const p1 = (await page.locator('.project-card[data-slot="p1"]').boundingBox())!;
    const awards = (await page.locator('.awards-card').boundingBox())!;
    expect(Math.abs(hero.width - p1.width)).toBeLessThan(4);
    expect(Math.abs(hero.y - p1.y)).toBeLessThan(2);
    expect(awards.y).toBeGreaterThan(hero.y + hero.height - 2);
  });

  test('mobile grid: single column, hero and first project stay large', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'mobile layout only');
    await page.goto('/zh');
    const hero = (await page.locator('.bento-hero').boundingBox())!;
    const p1 = (await page.locator('.project-card[data-slot="p1"]').boundingBox())!;
    const p2 = (await page.locator('.project-card[data-slot="p2"]').boundingBox())!;
    expect(Math.abs(hero.x - p2.x)).toBeLessThan(2);
    expect(Math.abs(hero.width - p2.width)).toBeLessThan(2);
    expect(hero.height).toBeGreaterThanOrEqual(319); // .bento-hero min-height: 320px
    expect(p1.height).toBeGreaterThanOrEqual(279); // [data-slot="p1"] min-height: 280px
  });

  test('experience snippet shows at most 5 entries and links to the full timeline', async ({ page }) => {
    await page.goto('/zh');
    const items = page.locator('#experience li');
    expect(await items.count()).toBeLessThanOrEqual(5);
    await expect(page.locator('#experience a.more-link')).toHaveAttribute('href', '/zh/about#timeline');
  });

  test('contact: email link, conditional résumé, copy button copies', async ({ page, context }, info) => {
    await page.goto('/en');
    const contact = page.locator('#contact');
    await expect(contact.locator('a[href="mailto:poter.pan@panspace.me"]')).toBeVisible();
    const hasResume = existsSync('public/resume-en.pdf');
    await expect(contact.locator('a[href="/resume-en.pdf"]')).toHaveCount(hasResume ? 1 : 0);
    test.skip(info.project.name !== 'desktop', 'clipboard permission is desktop-only in this setup');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const button = contact.locator('button[data-copy-email]');
    await expect(button).toBeVisible();
    await button.click();
    await expect(contact.locator('[data-copy-status]')).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('poter.pan@panspace.me');
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('content and navigation still work', async ({ page }) => {
      await page.goto('/zh');
      await expect(page.locator('.bento-hero h1')).toBeVisible();
      await expect(page.locator('.project-card').first()).toBeVisible();
      await expect(page.locator('a[href="mailto:poter.pan@panspace.me"]').first()).toBeVisible();
      await expect(page.locator('button[data-copy-email]')).toBeHidden();
      await page.locator('.project-card').first().click();
      await expect(page).toHaveURL(/\/zh\/work\//);
    });
  });
});
