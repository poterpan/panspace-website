#!/usr/bin/env node
// Post-build budgets: homepage JS < 100 KB gzip (spec §11) and AVIF/WebP <picture> for every optimized image.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export const HOME_JS_BUDGET = 100 * 1024;

const gz = (data) => gzipSync(data, { level: 9 }).length;

/** @param {string} html */
export function collectEntryScripts(html) {
  const urls = new Set();
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="(\/_astro\/[^"]+\.js)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/\b(?:component-url|renderer-url)="(\/_astro\/[^"]+\.js)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="(\/_astro\/[^"]+\.js)"/g)) urls.add(m[1]);
  return [...urls];
}

/** Static `import … from`, bare `import "…"` and `export … from` specifiers, resolved to /_astro URLs. */
export function collectStaticImports(code, fromUrl) {
  const out = new Set();
  const re = /(?:^|[;\s}])(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?["']([^"']+\.js)["']/gm;
  for (const m of code.matchAll(re)) {
    const spec = m[1];
    out.add(spec.startsWith('/') ? spec : posix.normalize(posix.join(posix.dirname(fromUrl), spec)));
  }
  return [...out];
}

export function jsClosure(distDir, entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const url = queue.pop();
    if (seen.has(url)) continue;
    seen.add(url);
    const file = join(distDir, url);
    if (!existsSync(file)) continue;
    for (const dep of collectStaticImports(readFileSync(file, 'utf8'), url)) queue.push(dep);
  }
  return [...seen];
}

/** Inline executable scripts (Astro's island runtime, the boot gate); JSON-LD excluded. */
export function inlineScripts(html) {
  return [...html.matchAll(/<script\b(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .filter((s) => s.trim().length > 0);
}

export function homeJsBytes(distDir, htmlPath) {
  const html = readFileSync(htmlPath, 'utf8');
  const files = jsClosure(distDir, collectEntryScripts(html)).filter((u) => existsSync(join(distDir, u)));
  const external = files.reduce((sum, u) => sum + gz(readFileSync(join(distDir, u))), 0);
  const inline = inlineScripts(html).reduce((sum, s) => sum + gz(s), 0);
  return external + inline;
}

export function findImageViolations(html) {
  const violations = [];
  const pictureRe = /<picture\b[\s\S]*?<\/picture>/g;
  for (const [picture] of html.matchAll(pictureRe)) {
    // Attribute order and casing differ between Astro (srcset first) and React (type first, srcSet).
    const hasAvif = /<source\b(?=[^>]*type="image\/avif")(?=[^>]*srcset=")[^>]*>/i.test(picture);
    const hasWebp = /<source\b(?=[^>]*type="image\/webp")(?=[^>]*srcset=")[^>]*>/i.test(picture);
    if (!hasAvif || !hasWebp) {
      violations.push(`picture without AVIF+WebP srcset: ${picture.slice(0, 140)}`);
    }
  }
  for (const m of html.replace(pictureRe, '').matchAll(/<img\b[^>]*\bsrc="(\/_astro\/[^"]+)"/g)) {
    violations.push(`optimized image outside <picture>: ${m[1]}`);
  }
  return violations;
}

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? (d.name === '_astro' ? [] : htmlFiles(join(dir, d.name))) : d.name.endsWith('.html') ? [join(dir, d.name)] : [],
  );
}

function main(distDir = 'dist') {
  let failed = false;
  for (const page of ['zh.html', 'en.html']) {
    const bytes = homeJsBytes(distDir, join(distDir, page));
    const ok = bytes < HOME_JS_BUDGET;
    failed ||= !ok;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${page}: homepage JS ${(bytes / 1024).toFixed(1)} KB gzip (budget ${HOME_JS_BUDGET / 1024} KB)`);
  }
  for (const file of htmlFiles(distDir)) {
    for (const v of findImageViolations(readFileSync(file, 'utf8'))) {
      failed = true;
      console.log(`FAIL ${file}: ${v}`);
    }
  }
  console.log(failed ? 'check-dist: FAILED' : 'check-dist: all budgets met');
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv[2]);
