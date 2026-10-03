import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { expect, test } from './fixtures';

const experience = parse(readFileSync('src/content/experience.yaml', 'utf8')) as { type: string }[];

test('has intro, timeline, awards, skills and contact sections', async ({ page }) => {
  await page.goto('/zh/about');
  await expect(page.locator('h1.page-title')).toHaveText('關於我');
  for (const id of ['timeline', 'awards', 'skills', 'contact']) await expect(page.locator(`#${id}`)).toBeAttached();
  await expect(page.locator('.timeline-item')).toHaveCount(experience.length);
});

test('timeline filters by type', async ({ page }) => {
  await page.goto('/en/about');
  const teaching = page.locator('button[data-timeline-filter="teaching"]');
  await expect(teaching).toBeVisible();
  await teaching.click();
  await expect(teaching).toHaveAttribute('aria-pressed', 'true');
  const expected = experience.filter((e) => e.type === 'teaching').length;
  await expect(page.locator('.timeline-item:visible')).toHaveCount(expected);
  for (const type of await page.locator('.timeline-item:visible').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.type))) {
    expect(type).toBe('teaching');
  }
  await page.locator('button[data-timeline-filter="all"]').click();
  await expect(page.locator('.timeline-item:visible')).toHaveCount(experience.length);
});

test('skills have no proficiency bars or percentages', async ({ page }) => {
  await page.goto('/en/about');
  const skills = page.locator('#skills');
  await expect(skills.locator('progress, meter, [role="progressbar"]')).toHaveCount(0);
  await expect(skills).not.toContainText('%');
});

test('the timeline line draws on scroll, and is static under reduced motion', async ({ page }) => {
  await page.goto('/en/about');
  const progress = page.locator('.timeline-progress');
  expect(await progress.evaluate((e) => getComputedStyle(e).animationName)).toBe('timeline-draw');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await progress.evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
});

test('the homepage "full experience" link lands on the timeline', async ({ page }) => {
  await page.goto('/zh');
  await page.locator('#experience a.more-link').click();
  await expect(page).toHaveURL(/\/zh\/about#timeline$/);
  await expect(page.locator('#timeline')).toBeInViewport();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all entries are visible and the filters are hidden', async ({ page }) => {
    await page.goto('/zh/about');
    await expect(page.locator('.timeline-filters')).toBeHidden();
    await expect(page.locator('.timeline-item:visible')).toHaveCount(experience.length);
  });
});
