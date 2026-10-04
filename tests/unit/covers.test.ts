import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import Cover from '../../src/components/covers/Cover.astro';
import DiscordBilling from '../../src/components/mdx/DiscordBilling.astro';
import { TINTS, coverTint, tintStyle } from '../../src/lib/covers';
import { renderAstro } from './helpers/render';

const root = 'src/content/projects';
const metas = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ({ slug: d.name, meta: parse(readFileSync(`${root}/${d.name}/meta.yaml`, 'utf8')) as Record<string, unknown> }));

describe('cover tints', () => {
  it('uses the first category unless coverTint overrides it', () => {
    expect(coverTint({ categories: ['ai', 'web'] })).toBe('emerald');
    expect(coverTint({ categories: ['competition', 'ios'] })).toBe('amber');
    expect(coverTint({ categories: ['ai'], coverTint: 'rose' })).toBe('rose');
  });
  it('exposes the glow and accent as custom properties', () => {
    expect(tintStyle('blue')).toBe(`--cover-glow:${TINTS.blue.glow};--cover-accent:${TINTS.blue.accent}`);
  });
});

describe('project covers', () => {
  it.each(metas.filter((m) => m.meta.coverStyle === 'schematic').map((m) => m.slug))(
    '%s has its schematic drawing',
    (slug) => expect(existsSync(`src/components/covers/schematic/${slug}.astro`)).toBe(true),
  );
  it.each(metas.filter((m) => m.meta.coverStyle === 'window').map((m) => m.slug))(
    '%s has its window panel',
    (slug) => expect(existsSync(`src/components/covers/window/${slug}.astro`)).toBe(true),
  );
  it('every window panel belongs to a project that uses it', () => {
    for (const file of readdirSync('src/components/covers/window')) {
      const slug = file.replace(/\.astro$/, '');
      expect(metas.find((m) => m.slug === slug)?.meta.coverStyle, file).toBe('window');
    }
  });
  it('every schematic drawing belongs to a project that uses it', () => {
    for (const file of readdirSync('src/components/covers/schematic')) {
      const slug = file.replace(/\.astro$/, '');
      expect(metas.find((m) => m.slug === slug)?.meta.coverStyle, file).toBe('schematic');
    }
  });
});

const fakeImage = (name: string) => ({ src: `/src/${name}.png`, width: 600, height: 1299, format: 'png' as const });
const project = (meta: Record<string, unknown>) => ({
  slug: 'demo-app',
  meta: { categories: ['ios'], coverStyle: 'image', ...meta },
  text: { zh: { data: { title: '示範 App', summary: 's' } }, en: { data: { title: 'Demo App', summary: 's' } } },
});
const tagline = { zh: '一行特徵', en: 'One-line feature' };

describe('<Cover>', () => {
  it('type: big name and tagline, hidden from assistive tech, with the path label', async () => {
    const html = await renderAstro(Cover, { lang: 'en', context: 'card', project: project({ coverStyle: 'type', coverTagline: tagline }) });
    expect(html).toContain('data-cover="type"');
    expect(html).toMatch(/<div class="cover-type" aria-hidden="true">/);
    expect(html).toContain('Demo App');
    expect(html).toContain('One-line feature');
    expect(html).toContain('~/work/demo-app');
  });
  it('type: coverTitle replaces the project title', async () => {
    const html = await renderAstro(Cover, {
      lang: 'zh', context: 'card', project: project({ coverStyle: 'type', coverTagline: tagline, coverTitle: { zh: '短名', en: 'Short' } }),
    });
    expect(html).toContain('短名');
    expect(html).not.toContain('示範 App');
  });
  it('phones: two framed screenshots announced through coverAlt', async () => {
    const html = await renderAstro(Cover, {
      lang: 'en', context: 'card',
      project: project({ coverStyle: 'phones', coverTagline: tagline, coverAlt: { zh: '兩張截圖', en: 'Two screenshots' }, screens: [fakeImage('a'), fakeImage('b')] }),
    });
    expect(html).toContain('data-cover="phones"');
    expect(html).toMatch(/class="cover-phones" role="img" aria-label="Two screenshots"/);
    expect(html.match(/class="cover-phone"/g)).toHaveLength(2);
    expect(html.match(/<img\b[^>]*\salt(?:="")?[\s>]/g)).toHaveLength(2);
    expect(html).not.toContain('cover-phone-bare');
  });
  it('phones: coverFramed false drops our frame for shots that already show a device', async () => {
    const html = await renderAstro(Cover, {
      lang: 'en', context: 'card',
      project: project({ coverStyle: 'phones', coverTagline: tagline, coverAlt: { zh: '兩張截圖', en: 'Two screenshots' }, screens: [fakeImage('a'), fakeImage('b')], coverFramed: false }),
    });
    expect(html.match(/class="cover-phone cover-phone-bare"/g)).toHaveLength(2);
  });
  it('phones: per-locale screens show the shots for the page language', async () => {
    const meta = { coverStyle: 'phones', coverTagline: tagline, coverAlt: { zh: '兩張截圖', en: 'Two screenshots' }, screens: { zh: [fakeImage('zh-a'), fakeImage('zh-b')], en: [fakeImage('en-a'), fakeImage('en-b')] } };
    const zh = await renderAstro(Cover, { lang: 'zh', context: 'card', project: project(meta) });
    const en = await renderAstro(Cover, { lang: 'en', context: 'card', project: project(meta) });
    expect(zh).toContain('zh-a');
    expect(zh).not.toContain('en-a');
    expect(en).toContain('en-b');
    expect(en).not.toContain('zh-b');
  });
  it('browser: the name beside one screenshot in a browser window, announced through coverAlt', async () => {
    const wide = { src: '/src/w.png', width: 1600, height: 842, format: 'png' as const };
    const html = await renderAstro(Cover, {
      lang: 'en', context: 'card',
      project: project({ coverStyle: 'browser', coverTagline: tagline, coverAlt: { zh: '網頁截圖', en: 'Dashboard screenshot' }, screens: [wide] }),
    });
    expect(html).toContain('data-cover="browser"');
    expect(html).toMatch(/<div class="cover-type" aria-hidden="true">/);
    expect(html).toContain('Demo App');
    expect(html).toMatch(/class="cover-browser" role="img" aria-label="Dashboard screenshot"/);
    expect(html.match(/<img\b[^>]*\salt(?:="")?[\s>]/g)).toHaveLength(1);
    expect(html).toContain('~/work/demo-app');
  });
  it('window: the name beside a hand-built app panel, all decorative', async () => {
    const html = await renderAstro(Cover, {
      lang: 'zh', context: 'card',
      project: { ...project({ coverStyle: 'window', coverTagline: tagline }), slug: 'chippot' },
    });
    expect(html).toContain('data-cover="window"');
    expect(html).toMatch(/class="cover-window" aria-hidden="true"/);
    expect(html).toContain('2026-10 開始繳費');
    expect(html).not.toMatch(/<img\b/);
  });
});

describe('<DiscordBilling>', () => {
  it.each([
    ['zh', ['2026-10 開始繳費', '@ChatGPT', '@Claude-Standard', '@Claude-Premium', '/繳費', '應用', '已完成繳費']],
    ['en', ['October 2026 billing is open', '@ChatGPT', '@Claude-Standard', '@Claude-Premium', '/pay', 'APP', 'Payment submitted']],
  ] as const)('%s: the billing message is real text, no bitmap', async (lang, texts) => {
    const html = await renderAstro(DiscordBilling, { lang, caption: 'cap' });
    for (const t of texts) expect(html, t).toContain(t);
    expect(html).not.toMatch(/<img\b/);
    expect(html).toMatch(/<figure class="mdx-discord">[\s\S]*<figcaption>cap<\/figcaption>/);
  });
  it('as a cover panel it is a plain block with no figure or caption', async () => {
    const html = await renderAstro(DiscordBilling, { lang: 'en', context: 'cover' });
    expect(html).not.toContain('<figure');
    expect(html).toContain('class="dc');
  });
});
