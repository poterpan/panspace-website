import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { featuredSlugs, orderedSlugs, projectMetas } from './routes';

const styleOf = (slug: string) => projectMetas().find((p) => p.slug === slug)?.meta.coverStyle ?? 'image';
const slugsWith = (style: string) => orderedSlugs().filter((s) => styleOf(s) === style);
const cardOf = (page: Page, slug: string) => page.locator(`a.vt-card[href="/zh/work/${slug}"]`);

for (const [path, slugs] of [['/zh', featuredSlugs()], ['/zh/work', orderedSlugs()]] as const) {
  test(`${path}: every card shows the cover style its meta picks`, async ({ page }) => {
    await page.goto(path);
    for (const slug of slugs) {
      const cover = cardOf(page, slug).locator('.cover');
      await expect(cover, slug).toHaveCount(1);
      await expect(cover, slug).toHaveAttribute('data-cover', styleOf(slug));
      const title = (await cardOf(page, slug).locator('.card-title').textContent())!;
      await expect(cardOf(page, slug), slug).toHaveAccessibleName(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    // Drawings and big type repeat the card's own text: decorative only.
    for (const svg of await page.locator('.cover-svg').all()) await expect(svg).toHaveAttribute('aria-hidden', 'true');
    for (const type of await page.locator('.cover-type').all()) await expect(type).toHaveAttribute('aria-hidden', 'true');
  });
}

const drawnSlugs = () => orderedSlugs().filter((s) => styleOf(s) !== 'image');

test('/zh/work shows image, phones, browser and schematic covers, with the path label on drawn ones', async ({ page }) => {
  await page.goto('/zh/work');
  for (const style of ['image', 'phones', 'browser', 'schematic']) {
    expect(slugsWith(style).length, style).toBeGreaterThan(0);
    await expect(page.locator(`.work-card .cover[data-cover="${style}"]`)).toHaveCount(slugsWith(style).length);
  }
  for (const slug of drawnSlugs()) {
    await expect(cardOf(page, slug).locator('.cover-path')).toHaveText(`~/work/${slug}`);
    await expect(cardOf(page, slug).locator('.cover-svg, .cover-name').first()).toBeVisible();
  }
});

test('the work grid keeps its covers after a filter re-renders it', async ({ page }) => {
  await page.goto('/zh/work');
  await expect(page.locator('astro-island[component-url*="WorkGrid"]:not([ssr])')).toBeAttached();
  await page.getByRole('button', { name: 'AI/CV', exact: true }).click();
  await page.getByRole('button', { name: '全部' }).click();
  await expect(page.locator('.work-card .cover')).toHaveCount(orderedSlugs().length);
  await expect(page.locator('.work-card .cover-svg')).toHaveCount(slugsWith('schematic').length);
});

type Probe = { __vt: number; __cardName?: string };
const openFrom = async (page: Page, path: string, slug: string) => {
  await page.addInitScript(() => {
    const proto = Document.prototype as unknown as { startViewTransition?: (...a: unknown[]) => unknown };
    const original = proto.startViewTransition;
    (window as unknown as Probe).__vt = 0;
    if (!original) return;
    proto.startViewTransition = function (this: unknown, ...args: unknown[]) {
      (window as unknown as Probe).__vt++;
      return original.apply(this, args);
    };
  });
  await page.addInitScript((s) => {
    document.addEventListener('astro:before-swap', () => {
      const card = document.querySelector(`a.vt-card[data-vt="card-${s}"]`);
      if (card) (window as unknown as Probe).__cardName = getComputedStyle(card).getPropertyValue('view-transition-name');
    });
  }, slug);
  await page.goto(path);
  await cardOf(page, slug).click();
  await expect(page).toHaveURL(new RegExp(`/zh/work/${slug}$`));
  await expect(page.locator('h1.project-title')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as Probe).__cardName)).toBe(`card-${slug}`);
  expect(await page.evaluate(() => (window as unknown as Probe).__vt)).toBeGreaterThanOrEqual(1);
};

test('a schematic card still grows into the project window', async ({ page }) => {
  const slug = featuredSlugs().find((s) => styleOf(s) === 'schematic')!;
  await openFrom(page, '/zh', slug);
  await expect(page.locator('.project-hero .cover[data-cover="schematic"] .cover-svg')).toBeVisible();
});

test('a phones card still grows into the project window', async ({ page }) => {
  const slug = slugsWith('phones').find((s) => !featuredSlugs().includes(s))!;
  await openFrom(page, '/zh/work', slug);
  await expect(page.locator('.project-hero .cover[data-cover="phones"] .cover-phone')).toHaveCount(2);
});

test('phones and browser covers announce their screenshots once, through coverAlt', async ({ page }) => {
  await page.goto('/zh/work');
  for (const slug of [...slugsWith('phones'), ...slugsWith('browser')]) {
    const shots = cardOf(page, slug).locator('.cover-phones, .cover-browser');
    await expect(shots, slug).toHaveAttribute('role', 'img');
    await expect(shots, slug).toHaveAttribute('aria-label', /.+/);
    for (const img of await shots.locator('img').all()) await expect(img, slug).toHaveAttribute('alt', '');
  }
});

test('ntutbox shots already show a device, so its phones cover is not framed twice', async ({ page }) => {
  await page.goto('/zh');
  await expect(cardOf(page, 'ntutbox').locator('.cover-phone-bare')).toHaveCount(2);
  const padding = await cardOf(page, 'ntutbox').locator('.cover-phone').first().evaluate((el) => getComputedStyle(el).paddingTop);
  expect(padding).toBe('0px');
  const framed = slugsWith('phones').find((s) => s !== 'ntutbox')!;
  await page.goto('/zh/work');
  await expect(cardOf(page, framed).locator('.cover-phone-bare')).toHaveCount(0);
});

test('a browser cover shows one screenshot in a window that bleeds off the right edge', async ({ page }) => {
  const slug = slugsWith('browser')[0]!;
  await page.goto('/zh/work');
  const cover = cardOf(page, slug).locator('.cover');
  const win = cover.locator('.cover-browser');
  await expect(win.locator('img')).toHaveCount(1);
  await expect(win.locator('img')).toBeVisible();
  const [c, w] = await Promise.all([cover.boundingBox(), win.boundingBox()]);
  expect(w!.x + w!.width).toBeGreaterThan(c!.x + c!.width);
  await expect(cover.locator('.cover-name')).toBeVisible();
});

test('PhoneStrip: a focusable region of phone-framed screenshots that scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/zh/work/ntutbox');
  const region = page.getByRole('region', { name: '北科盒子 App 截圖' });
  await expect(region).toHaveAttribute('tabindex', '0');
  // ntutbox's shots already include a device, so this strip opts out of our frame.
  await expect(region.locator('.phone-bare img')).toHaveCount(4);
  await expect(region.locator('.phone-frame')).toHaveCount(0);
  await expect(region.locator('figcaption')).toHaveText(['今日總覽', '成績與排名', '北科小郵差', '學校帳號登入']);
  const overflow = await region.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeGreaterThan(0);
  await region.focus();
  await expect(region).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
});

test('PhoneStrip snaps without smooth scrolling when motion is reduced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh/work/ntutbox');
  const track = page.locator('.mdx-phones-track');
  expect(await track.evaluate((el) => getComputedStyle(el).scrollBehavior)).toBe('auto');
  expect(await track.evaluate((el) => getComputedStyle(el).scrollSnapType)).toContain('x');
});

test('no horizontal page overflow at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const drawn = ['phones', 'browser', 'schematic'].map((style) => slugsWith(style)[0]!);
  for (const path of ['/zh', '/zh/work', '/zh/work/ntutbox', ...drawn.map((s) => `/zh/work/${s}`)]) {
    await page.goto(path);
    const extra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(extra, path).toBeLessThanOrEqual(0);
  }
});
