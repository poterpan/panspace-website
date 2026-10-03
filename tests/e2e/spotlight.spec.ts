import { expect, test } from './fixtures';

const card = '.project-card[data-slot="p1"]';
const degrees = (transform: string) => [...transform.matchAll(/rotate[XY]\((-?[\d.]+)deg\)/g)].map((m) => Number(m[1]));

test('desktop: hovering tilts (≤ 7°) and lights the card, leaving resets it', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'pointer: fine only');
  await page.goto('/zh');
  const el = page.locator(card);
  const box = (await el.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2);
  await expect.poll(() => el.evaluate((e) => (e as HTMLElement).style.transform)).toContain('rotateY(');
  const style = await el.evaluate((e) => ({ t: (e as HTMLElement).style.transform, mx: (e as HTMLElement).style.getPropertyValue('--mx') }));
  for (const d of degrees(style.t)) expect(Math.abs(d)).toBeLessThanOrEqual(7);
  expect(style.mx).toMatch(/px$/);
  await page.mouse.move(2, 2);
  await expect.poll(() => el.evaluate((e) => (e as HTMLElement).style.transform)).toBe('');
});

test('reduced motion: no tilt and no glow', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'pointer: fine only');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh');
  const el = page.locator(card);
  await el.hover();
  await page.waitForTimeout(100);
  expect(await el.evaluate((e) => (e as HTMLElement).style.transform)).toBe('');
  expect(await el.evaluate((e) => getComputedStyle(e, '::before').content)).toBe('none');
});

test('touch: pressing scales the card to 0.98, hover never tilts', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'pointer: coarse only');
  await page.goto('/zh');
  const el = page.locator(card);
  const box = (await el.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  expect(await el.evaluate((e) => (e as HTMLElement).style.transform)).toBe('');
  await page.mouse.down();
  await expect.poll(() => el.evaluate((e) => getComputedStyle(e).transform)).toBe('matrix(0.98, 0, 0, 0.98, 0, 0)');
  await page.mouse.up();
});
