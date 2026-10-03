import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  HOME_JS_BUDGET, collectEntryScripts, collectStaticImports, findImageViolations, homeJsBytes, jsClosure,
} from '../../scripts/check-dist.mjs';

describe('script collection', () => {
  it('finds module scripts, island component/renderer URLs and modulepreloads', () => {
    const html = `<script type="module" src="/_astro/page.a.js"></script>
      <astro-island component-url="/_astro/CommandPalette.b.js" renderer-url="/_astro/client.c.js"></astro-island>
      <link rel="modulepreload" href="/_astro/chunk.d.js"><script type="application/ld+json">{}</script>`;
    expect(collectEntryScripts(html).sort()).toEqual(['/_astro/CommandPalette.b.js', '/_astro/chunk.d.js', '/_astro/client.c.js', '/_astro/page.a.js']);
  });
  it('follows static imports only (not dynamic import())', () => {
    const code = 'import{a as b}from"./b.js";import"./c.js";export{d}from"./e.js";const l=()=>import("./lazy.js");';
    expect(collectStaticImports(code, '/_astro/x.js').sort()).toEqual(['/_astro/b.js', '/_astro/c.js', '/_astro/e.js']);
  });
});

describe('homeJsBytes', () => {
  it('sums gzip sizes over the static import closure plus inline scripts', () => {
    const dist = mkdtempSync(join(tmpdir(), 'dist-'));
    mkdirSync(join(dist, '_astro'));
    const a = 'import"./b.js";console.log("a".repeat(50));';
    const b = 'console.log("b".repeat(50));';
    writeFileSync(join(dist, '_astro', 'a.js'), a);
    writeFileSync(join(dist, '_astro', 'b.js'), b);
    const inline = 'window.x=1';
    writeFileSync(join(dist, 'zh.html'), `<script type="module" src="/_astro/a.js"></script><script>${inline}</script>`);
    expect(jsClosure(dist, ['/_astro/a.js']).sort()).toEqual(['/_astro/a.js', '/_astro/b.js']);
    const expected = gzipSync(a, { level: 9 }).length + gzipSync(b, { level: 9 }).length + gzipSync(inline, { level: 9 }).length;
    expect(homeJsBytes(dist, join(dist, 'zh.html'))).toBe(expected);
    expect(HOME_JS_BUDGET).toBe(100 * 1024);
  });
});

describe('findImageViolations', () => {
  const good = '<picture><source type="image/avif" srcset="/_astro/a.avif 400w"><source type="image/webp" srcset="/_astro/a.webp 400w"><img src="/_astro/a.png" srcset="/_astro/a.png 400w"></picture>';
  const astroOrder = '<picture><source srcset="/_astro/a.avif 400w" type="image/avif" sizes="100vw"><source srcset="/_astro/a.webp 400w" type="image/webp" sizes="100vw"><img src="/_astro/a.png"></picture>';
  const reactCase = '<picture><source type="image/avif" srcSet="/_astro/a.avif 400w"><source type="image/webp" srcSet="/_astro/a.webp 400w"><img src="/_astro/a.png"></picture>';
  it('accepts AVIF+WebP pictures in either attribute order', () => {
    expect(findImageViolations(good)).toEqual([]);
    expect(findImageViolations(astroOrder)).toEqual([]);
  });
  it('accepts React-cased srcSet attributes', () => {
    expect(findImageViolations(reactCase)).toEqual([]);
  });
  it('flags bare optimized images and pictures missing a format', () => {
    expect(findImageViolations('<img src="/_astro/x.png">')).toHaveLength(1);
    expect(findImageViolations('<picture><source type="image/webp" srcset="/_astro/a.webp 1x"><img src="/_astro/a.png"></picture>')).toHaveLength(1);
  });
  it('ignores non-optimized images such as the favicon', () => expect(findImageViolations('<img src="/favicon.svg">')).toEqual([]));
});
