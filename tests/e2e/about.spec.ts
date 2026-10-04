import { existsSync, readFileSync } from 'node:fs';
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

test('contact: email link, conditional résumé, copy button copies', async ({ page, context }, info) => {
  await page.goto('/en/about');
  const contact = page.locator('#contact');
  await expect(contact.locator('a[href="mailto:poter.pan@panspace.me"]')).toBeVisible();
  const hasResume = existsSync('public/resume-en.pdf');
  await expect(contact.locator('a[href="/resume-en.pdf"]')).toHaveCount(hasResume ? 1 : 0);
  // The label reads as its own column, not glued to the address.
  const label = await contact.locator('.contact-label').first().boundingBox();
  const value = await contact.locator('a.contact-value').first().boundingBox();
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

test('contact rows share one layout: mono label, then the value as link text', async ({ page }) => {
  await page.goto('/en/about');
  const rows = page.locator('#contact .contact-row');
  const labels = (await rows.locator('dt').allTextContents()).map((t) => t.trim());
  expect(labels).toEqual(expect.arrayContaining(['Email', 'GitHub', 'LinkedIn']));
  await expect(page.locator('#contact a.contact-value[href="https://github.com/poterpan"]')).toHaveText('github.com/poterpan');
  await expect(page.locator('#contact a.contact-value[href="https://www.linkedin.com/in/poterpan"]')).toHaveText('linkedin.com/in/poterpan');
  const sizes = await page.locator('#contact a.contact-value').evaluateAll((as) => as.map((a) => getComputedStyle(a).fontSize + getComputedStyle(a).fontFamily));
  expect(new Set(sizes).size).toBe(1);
  const xs = await page.locator('#contact a.contact-value').evaluateAll((as) => as.map((a) => Math.round(a.getBoundingClientRect().x)));
  expect(new Set(xs).size).toBe(1);
  await expect(page.locator('#contact button[data-copy-email]')).toHaveCount(1);
  await expect(rows.filter({ has: page.locator('button[data-copy-email]') }).locator('dt')).toHaveText('Email');
});
