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
    // The first project's cover spans the card's full content width.
    const cover = (await page.locator('.project-card[data-slot="p1"] .card-cover').boundingBox())!;
    expect(cover.width).toBeGreaterThan(p1.width - 40);
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
    // The label reads as its own column, not glued to the address.
    const label = await contact.locator('.contact-label').boundingBox();
    const value = await contact.locator('a.contact-value').boundingBox();
    expect(value!.x - (label!.x + label!.width)).toBeGreaterThanOrEqual(12);
    test.skip(info.project.name !== 'desktop', 'clipboard permission is desktop-only in this setup');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const button = contact.getByRole('button', { name: 'Copy email' });
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Copy');
    await expect(button.locator('svg.icon-copy')).toBeVisible();
    await button.click();
    await expect(button).toHaveText('Copied');
    await expect(contact.locator('[data-copy-status]')).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('poter.pan@panspace.me');
    await expect(button).toHaveText('Copy', { timeout: 3000 });
    await expect(contact.locator('[data-copy-status]')).toHaveText('');
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
    test('the `$ now` panel is plain text in the HTML', async ({ page }) => {
      await page.goto('/zh');
      const panel = page.locator('.bento-hero .now-panel');
      for (const text of ['building', 'NTUTBox 北科盒子', 'studying', '北科大碩士 · 醫學影像 AI', 'based in', '台北', '開放接案中']) {
        await expect(panel).toContainText(text);
      }
      await expect(panel.locator('.now-line').last()).toBeVisible();
    });
  });

  test.describe('$ now panel', () => {
    test('lines come from profile.yaml plus the availability status', async ({ page }) => {
      await page.goto('/en');
      const values = await page.locator('.now-panel .now-value').allTextContents();
      expect(values.map((v) => v.trim())).toEqual(['NTUTBox', 'MS @ NTUT · medical-imaging AI', 'Taipei', 'Open for freelance']);
      await expect(page.locator('.now-panel .now-status .status-dot')).toHaveAttribute('data-status', 'open');
    });

    test('reduced motion: the panel is static', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/zh');
      for (const line of await page.locator('.now-panel .now-line').all()) {
        expect(await line.evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
        await expect(line).toBeVisible();
      }
    });

    test('types in once when the boot sequence is skipped, and ends fully shown', async ({ page }) => {
      await page.goto('/zh');
      const last = page.locator('.now-panel .now-line').last();
      expect(await last.evaluate((e) => getComputedStyle(e).animationName)).toBe('now-type');
      await expect.poll(() => last.evaluate((e) => e.getAnimations().every((a) => a.playState === 'finished'))).toBe(true);
      expect(await last.evaluate((e) => getComputedStyle(e).clipPath)).toMatch(/^(inset\((0(px|%)?\s*)+\)|none)$/);
    });

    test.describe('first visit', () => {
      test.use({ bootSeen: false });
      test('waits for the boot sequence before typing', async ({ page }) => {
        await page.goto('/zh');
        await expect(page.locator('html')).toHaveAttribute('data-boot', 'play');
        await expect(page.locator('.now-panel .now-line').first()).toBeHidden();
        await expect(page.locator('html')).toHaveAttribute('data-boot', 'done', { timeout: 5000 });
        await expect(page.locator('.now-panel .now-line').first()).toBeVisible();
      });
    });
  });

  test('project cards are cover + title + tag line only; /work keeps the descriptions', async ({ page }) => {
    await page.goto('/zh');
    await expect(page.locator('.project-card')).toHaveCount(featuredSlugs().slice(0, 5).length);
    await expect(page.locator('.project-card .card-summary')).toHaveCount(0);
    for (const card of await page.locator('.project-card').all()) {
      await expect(card.locator('.mono-path')).toBeVisible();
      await expect(card.locator('.card-title')).toBeVisible();
      await expect(card.locator('.card-cover')).toBeVisible();
    }
    await page.goto('/zh/work');
    expect(await page.locator('.work-card .card-summary').count()).toBeGreaterThan(0);
  });

  test('awards card: count, three highlights and an "All" link to the awards section', async ({ page }) => {
    await page.goto('/zh');
    const card = page.locator('a.awards-card');
    await expect(card).toHaveAttribute('href', '/zh/about#awards');
    await expect(card.locator('.awards-mini li')).toHaveCount(3);
    await expect(card.locator('.awards-mini li').first()).toContainText('2024');
    await expect(card.locator('.awards-all')).toHaveText('全部 →');
    await card.click();
    await expect(page).toHaveURL(/\/zh\/about#awards$/);
    await expect(page.locator('section#awards')).toBeAttached();
  });

  test('stack card lists four to six tools', async ({ page }) => {
    await page.goto('/en');
    const tools = (await page.locator('.stack-card dd').allTextContents()).flatMap((t) => t.split(' · '));
    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools.length).toBeLessThanOrEqual(6);
  });

  test('no horizontal overflow at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/zh', '/en']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
    }
  });
});
