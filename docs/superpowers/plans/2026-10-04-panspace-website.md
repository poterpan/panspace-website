# Pan's Space Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship `https://panspace.me`, a bilingual (zh/en) static portfolio site: a dark Bento homepage with spotlight/tilt cards, a first-visit boot sequence, card→page view-transition morphs, a ⌘K command palette, a filterable work list, project pages, and an about page. All content lives in the repo, and every push to `main` deploys to Cloudflare Workers Static Assets.

**Architecture:** Astro 7 builds the static site (`output: 'static'`, `build.format: 'file'`, `trailingSlash: 'never'`). Pages live under a dynamic `src/pages/[lang]/` segment, and small path helpers in `src/lib/i18n.ts` handle language routing. The Astro `i18n` config is deliberately left unset, because the root `/` page is our own language redirector. Content comes from Astro content collections (YAML + MDX) validated by zod. The pure logic (sorting, i18n, boot timing, tilt math, fuzzy search, SEO builders) lives in framework-free `src/lib/*.ts` modules that Vitest unit-tests. Interactivity is progressive enhancement: the spotlight, boot sequence, copy button and timeline filter are tiny vanilla TS modules. React islands are used only for the ⌘K palette (`client:idle`, on every page) and the `/work` grid (`client:load`, Motion layout animations), which keeps homepage JS under the 100 KB gzip budget. `<ClientRouter />` drives the view transitions. Playwright runs against `wrangler dev`, which serves `dist/` with the same asset rules as production.

**Tech Stack (pinned, verified 2026-10-04):** astro 7.3.5 · @astrojs/react 7.0.0 · @astrojs/mdx 8.0.2 · @astrojs/sitemap 3.7.4 · @astrojs/check 0.9.10 · react / react-dom 19.3.0 · motion 14.0.0 (`motion/react`) · tailwindcss + @tailwindcss/vite 4.3.3 · typescript 6.0.3 (NOT 7.x — `@astrojs/check` peer range is `^5 || ^6`) · vitest 5.0.3 (via Astro `getViteConfig`) · @playwright/test 1.63.0 (chromium only) · wrangler 4.147.0 · sharp 0.35.5 · satori 0.35.0 + @resvg/resvg-js 2.6.2 (build-time OG PNGs) · @fontsource-variable/geist + geist-mono 5.3.0 (site fonts via Astro Fonts API local provider) · @fontsource/geist + geist-mono + noto-sans-tc 5.3.0 (static .woff for satori) · yaml 2.9.1 (tests) · @lhci/cli 0.15.1 · linkinator 8.1.0 · Node ≥ 22.12 (`.node-version` = 22.19.0) · pnpm 11.5.0.

**Spec:** `docs/superpowers/specs/2026-10-04-panspace-website-design.md` (authoritative; read it before starting any task).

## Global Constraints

Every task's requirements implicitly include this section.

**Product scope (spec §1–§4)**
- Bilingual zh/en under `/zh` and `/en`; `{lang}` ∈ `zh`, `en`; switching language stays on the same page.
- Routes: `/` (language redirect: stored choice first, then Accept-Language), `/{lang}`, `/{lang}/work`, `/{lang}/work/{slug}`, `/{lang}/about`, `/404` ("command not found"), `/resume-zh.pdf` and `/resume-en.pdf` (download entry hidden when the file is absent).
- Out of scope, never add: blog, contact form, comments, visitor counter, CMS admin, light/dark toggle (dark only).
- Canonical host is `https://panspace.me`. `www.panspace.me` and the `panspace.dev` apex 301 → `https://panspace.me` (path preserved), done with Cloudflare Redirect Rules, not code. **Never** put portfolio content on `*.panspace.dev`.

**Content rules (spec §5–§6)**
- `meta.yaml` fields and types are exactly as in spec §5 (plus `coverAlt: {zh, en}`, added for accessibility). zh **and** en MDX are both required, or the build fails.
- Project page body sections, in this fixed order: 背景與問題 → 我的角色 → 做法與技術決策 → 成果 → 學到什麼 (en: Background & problem → My role → Approach & technical decisions → Outcome → What I learned).
- `confidential: true`: never render `links.github`. Show 「商業專案・客戶資訊保密」 in the sidebar. **No client or vendor names** anywhere in text or meta.
- Spine AI: the partner is written as 「醫學中心」 / "a medical center", never the hospital name.
- Only convincing numbers. No install or download counts (e.g. the FCU check-in app's install count is never written).
- Never publish phone numbers, family background, birth data, contract scans, student IDs, or grey-area repos (ticket grabbing, course-selection, auto check-in scripts, and similar).
- **This repo becomes public.** Never write client, vendor or hospital names, or the names of private repos, into any committed file (plans, tests, commit messages, PR text included). Store sensitive terms only as SHA-256 hashes in `content-policy/denylist.json` (Task 2).

**Visual and interaction (spec §7, §9, §10)**
- Colors: background ≈ `#07080a`, card ≈ `#101216`, line ≈ `#1f232b`, accent `#34d399`, accent-2 `#60a5fa`. All text meets WCAG AA contrast. Thin grid background. Dark only.
- Fonts: Geist + Geist Mono, self-hosted. Chinese uses system fonts `PingFang TC`, `Microsoft JhengHei`.
- OS elements (mono path eyebrows, status dots, `kbd` hints) in navigation and headings only; don't overuse them.
- Spotlight + tilt: only on `pointer: fine`, tilt ≤ 7°. On touch, pressing scales the card to 0.98. Off under `prefers-reduced-motion`.
- Boot: only on `/{lang}` on the first visit (`localStorage`; a read or write failure counts as already seen), ≤ 2.5 s total, skippable with any key or click. Never plays under reduced motion or when arriving from another page. The Bento HTML is already rendered underneath it.
- Card → project page morph: card, title and cover each get a `view-transition-name`; going back morphs in reverse. Reduced motion: cross-fade only. Browsers without View Transitions get normal navigation.
- ⌘K: opened by `⌘K`, `Ctrl+K` or `/`; a bottom-right floating button on touch. Items: all pages and projects, switch zh/en (stay on the same page), copy email, download résumé, open GitHub, open LinkedIn. Fuzzy search plus arrow-key navigation. Works under reduced motion, without animation.
- `/work` filter re-layout uses Motion layout animation; under reduced motion it switches instantly.
- Progressive enhancement: with JS failing, all reading and navigation still work.

**Engineering and quality (spec §11)**
- CI-enforced: Lighthouse ≥ 95 on all four categories (mobile); homepage JS < 100 KB compressed (gzip); images via `astro:assets` as AVIF/WebP with `srcset`.
- Accessibility: full keyboard operation; Bento cards are focusable links. ⌘K follows the combobox/listbox ARIA pattern, traps focus while open, and `Esc` closes it. Visible focus rings.
- SEO: every page has `hreflang` (`zh-Hant`, `en`, `x-default`), canonical, sitemap. JSON-LD `Person` (home, about) and `CreativeWork` (project pages). One dark OS-style OG image per project, generated at build.
- Analytics: Cloudflare Web Analytics only, no cookies.
- Tests: `astro check`; Playwright (every route zh+en returns 200, ⌘K opens and navigates, boot doesn't play under reduced motion, language switch stays on the same page); link check; Lighthouse CI. GitHub Actions runs them on PRs; Workers Builds deploys `main` and creates PR preview URLs.

**Process**
- Work in an isolated git worktree on a feature branch created from a freshly fetched base (superpowers:using-git-worktrees). Run every command from the repo (worktree) root.
- Package manager: pnpm 11.5.0. Add dependencies with `pnpm add -E` at the exact versions listed in Tech Stack. Do not upgrade anything.
- Every commit: stage explicit paths only (`git add <path> …`; never `git add -A`, `git add .` or `git commit -a`). Commit messages contain **no** `Co-Authored-By` trailer and no "Claude", "Anthropic" or "Generated with" text.
- Steps marked **[GATED — requires user confirmation before executing]** are outward-facing (public repo, deploys, DNS/redirect changes). Stop and get explicit user approval first.

## Review Focus

These are failure modes the spec implies but doesn't spell out. Each line names the condition and the behavior a reasonable visitor expects. Each one has a pinned test in its owning task.

1. **First visit through `https://panspace.me/` (root redirect).** The root page `location.replace`s to `/zh`, so `/zh` sees a same-origin `document.referrer` of `/`. The boot sequence must still play, because "arrived from another page" must not include the root redirector. Test: Task 6, `boot.spec.ts` › "plays after the root language redirect".
2. **Blocked or throwing `localStorage`** (Safari private mode, disabled site data). The root redirect falls back to Accept-Language, boot counts as seen (doesn't play), and language switching and the palette still work. Tests: Task 1 `root.spec.ts` › "storage blocked", Task 6 `boot.spec.ts` › "storage blocked", Task 11 `palette.spec.ts` › "switch language with storage blocked".
3. **Non-canonical URL forms** (`/zh/work/ntutbox/`, `/zh/work/ntutbox.html`). These 307 to the slash-less canonical path, and the language switch on the resulting page still targets the same page. Tests: Task 1 `stripLocale` unit cases, Task 7 `project.spec.ts` › "non-canonical forms redirect".
4. **Duplicate `view-transition-name` on one page** (e.g. the same project rendered twice). The browser silently aborts the whole transition. Every page must have unique names. Test: Task 8 `morph.spec.ts` › "names are unique on every page", which Task 9 extends to `/work`.
5. **Keyboard shortcuts while typing.** Typing `/` in the palette input (or any text field) must insert the character, not reopen or hijack. `⌘K`/`Ctrl+K` while open must toggle the palette closed. An unknown `/work?cat=` value must fall back to "All", not show an empty grid. Tests: Task 11 `palette.spec.ts` › "slash while typing", "toggle closes"; Task 9 `work.spec.ts` › "unknown category falls back to all".

---

## File Structure

```
package.json · pnpm-workspace.yaml · .node-version · .gitignore
astro.config.mjs · tsconfig.json · vitest.config.ts · playwright.config.ts
wrangler.jsonc · lighthouserc.json · linkinator.config.json
.github/workflows/ci.yml
content-policy/denylist.json            SHA-256 hashes of forbidden terms (never plaintext)
scripts/
  make-cover.mjs                        generates temporary cover PNGs
  content-policy.mjs                    normalize/hash/denylist/phone/metric/repo-link checks
  denylist-add.mjs                      CLI: add a term's hash to the denylist
  check-dist.mjs                        post-build budgets: homepage JS gzip, AVIF/WebP pictures
public/  favicon.svg · robots.txt · _headers · (resume-zh.pdf, resume-en.pdf when supplied)
src/
  content.config.ts                     collections: projectMeta, projectBody, profile, experience, awards
  content/ profile.yaml · experience.yaml · awards.yaml · projects/<slug>/{meta.yaml,zh.mdx,en.mdx,images/}
  env.d.ts                              PUBLIC_CF_BEACON_TOKEN typing
  i18n/ui.ts                            every UI string, zh + en, plus t()/format()/label helpers
  lib/                                  framework-free, unit-tested
    storage.ts      BOOT_KEY, LANG_KEY, safeGet, safeSet
    taxonomy.ts     CATEGORIES, EXPERIENCE_TYPES (zod-free; safe for client islands)
    i18n.ts         LOCALES, Locale, Localized, HTML_LANG, localizedPath, stripLocale, switchLangPath, pickLocale, langPaths
    schemas.ts      zod schemas for all collections (build-time only; never import from client code)
    dates.ts        formatYm, formatPeriod
    projects.ts     assembleProjects, sortForList, featuredForHome, neighbors, visibleLinks, filterByCategory
    experience.ts   sortByStartDesc, recentExperience, sortAwards, awardYearRange
    content.ts      astro:content accessors (getProjects, getProfile, getExperience, getAwards) — not unit-tested
    resume.ts       resumeHref
    seo.ts          SITE, canonicalUrl, alternateLinks, ogImageUrl, personJsonLd, projectJsonLd, jsonLdScript
    og.ts           renderOgPng (satori + resvg)
    tilt.ts         tiltFor, tiltTransform
    boot.ts         bootGate, bootGateScript, bootLines, buildBootTimeline
    transitions.ts  vtNames, vtStyle
    fuzzy.ts        fuzzyScore, fuzzyFilter
    palette.ts      PaletteItem types, buildPaletteItems
    work.ts         WorkCardData, WorkFilter, parseCategoryParam
    analytics.ts    beaconConfig
  scripts/                              client-side vanilla modules (bundled by Astro)
    global.ts · lang-memory.ts · copy-email.ts · spotlight.ts · boot.ts · timeline-filter.ts
  styles/global.css                     Tailwind v4 import, tokens, all site CSS sections
  layouts/BaseLayout.astro
  components/
    SeoHead.astro · Nav.astro · LangSwitch.astro · Footer.astro · ContactSection.astro · BeaconScript.astro
    home/  BentoGrid · HeroCard · ProjectCard · AwardsCard · StackCard · StatusBar · ExperienceSnippet · BootOverlay (.astro)
    project/ ProjectFacts.astro · ProjectNav.astro
    mdx/   Gallery · Compare · Diagram · Stat (.astro) · index.ts
    about/ Timeline.astro · AwardsList.astro · SkillsList.astro
    work/WorkGrid.tsx                   React + Motion island
    palette/CommandPalette.tsx          React island
  pages/
    index.astro · 404.astro
    [lang]/index.astro · [lang]/about.astro · [lang]/work/index.astro · [lang]/work/[slug].astro
    og/[lang]/site.png.ts · og/[lang]/work/[slug].png.ts
tests/
  unit/*.test.ts · unit/helpers/render.ts   Vitest (+ Astro Container API helper)
  e2e/fixtures.ts · e2e/routes.ts · e2e/*.spec.ts   Playwright (desktop + mobile projects)
```

Decisions you shouldn't re-open while executing:
- **Styling: Tailwind CSS v4** (`@tailwindcss/vite`). Tokens go in `@theme`. Feature CSS goes in named sections of `src/styles/global.css` so view-transition overrides can stay unlayered (they must beat Astro's own unlayered `!important` reduced-motion rule).
- **URL shape:** `build.format: 'file'` + `trailingSlash: 'never'` + Workers `html_handling: "drop-trailing-slash"` produces `dist/zh.html`, served at `/zh`, while `/zh/` 307s to `/zh` (verified with wrangler 4.147). `Astro.url.pathname` ends in `.html` in this mode, so **pages pass a language-less `path` prop explicitly. Never derive it from `Astro.url`.**
- **Root language redirect is client-side.** `navigator.languages` is the browser's Accept-Language list; the stored choice (`panspace:lang`) wins over it. JS-disabled visitors see two language links.

---

### Task 1: Scaffold, toolchain, i18n helpers, root language redirect

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.node-version`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `wrangler.jsonc`
- Create: `src/lib/storage.ts`, `src/lib/i18n.ts`, `src/pages/index.astro`, `src/pages/[lang]/index.astro`, `public/favicon.svg`
- Create: `tests/unit/storage.test.ts`, `tests/unit/i18n.test.ts`, `tests/e2e/fixtures.ts`, `tests/e2e/root.spec.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `src/lib/storage.ts`: `BOOT_KEY = 'panspace:boot-seen'`, `LANG_KEY = 'panspace:lang'`, `safeGet(getStorage: () => Pick<Storage,'getItem'|'setItem'>, key: string): string | null`, `safeSet(getStorage, key, value): boolean`
  - `src/lib/i18n.ts`: `LOCALES = ['zh','en'] as const`, `type Locale`, `type Localized<T = string> = Record<Locale, T>`, `DEFAULT_LOCALE: 'zh'`, `FALLBACK_LOCALE: 'en'`, `HTML_LANG: Record<Locale,string>` (`zh-Hant`, `en`), `isLocale(v: unknown): v is Locale`, `otherLocale(l: Locale): Locale`, `normalizePath(path: string): string`, `localizedPath(lang: Locale, path?: string): string`, `stripLocale(pathname: string): { lang: Locale | null; path: string }`, `switchLangPath(pathname: string, target: Locale): string`, `pickLocale(input: { stored: string | null; languages: readonly string[] }): Locale`, `langPaths(): { params: { lang: Locale } }[]`
  - `tests/e2e/fixtures.ts`: `test` (with option `bootSeen: boolean`, default `true`, which pre-seeds `BOOT_KEY` so the boot overlay never interferes), `expect`
  - npm scripts: `dev`, `build`, `check`, `test`, `test:e2e`, `preview:cf` (wrangler dev on `127.0.0.1:8788`). `E2E_SKIP_BUILD=1 pnpm test:e2e` reuses an existing `dist/`; plain `pnpm test:e2e` builds first.

- [ ] **Step 1: Write the package manifest, pnpm build approvals and Node pin**

`package.json`:

```json
{
  "name": "panspace-website",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.5.0",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "check": "astro check",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "preview:cf": "wrangler dev --port 8788 --ip 127.0.0.1 --show-interactive-dev-session=false"
  }
}
```

`pnpm-workspace.yaml` (pnpm 11 refuses dependency build scripts unless allowed here; write it **before** installing):

```yaml
allowBuilds:
  esbuild: true
  sharp: true
  workerd: true
```

`.node-version`:

```
22.19.0
```

Append to `.gitignore` (keep the existing lines):

```
playwright-report/
test-results/
.lighthouseci/
```

- [ ] **Step 2: Install pinned dependencies**

```bash
pnpm add -E astro@7.3.5 @astrojs/react@7.0.0 @astrojs/mdx@8.0.2 @astrojs/sitemap@3.7.4 react@19.3.0 react-dom@19.3.0 motion@14.0.0 @fontsource-variable/geist@5.3.0 @fontsource-variable/geist-mono@5.3.0
pnpm add -D -E typescript@6.0.3 @astrojs/check@0.9.10 @types/react@19.3.0 @types/react-dom@19.3.0 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vitest@5.0.3 @playwright/test@1.63.0 wrangler@4.147.0 sharp@0.35.5 satori@0.35.0 @resvg/resvg-js@2.6.2 @fontsource/geist@5.3.0 @fontsource/geist-mono@5.3.0 @fontsource/noto-sans-tc@5.3.0 yaml@2.9.1 @lhci/cli@0.15.1 linkinator@8.1.0
pnpm exec playwright install chromium
```

Expected: both `pnpm add` commands end with `Done in …` and there is no `ERR_PNPM_IGNORED_BUILDS` line. If pnpm reports another ignored build, add that package name with `true` to `allowBuilds` and re-run `pnpm install`.

- [ ] **Step 3: Write Astro, TypeScript, Vitest, Playwright and Wrangler configs**

`astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://panspace.me',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react(), mdx()],
  vite: { plugins: [tailwindcss()] },
});
```

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "playwright-report", "test-results", ".lighthouseci"],
  "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "react" }
}
```

`vitest.config.ts`:

```ts
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node', testTimeout: 30_000 },
});
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 8788;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? 'pnpm preview:cf' : 'pnpm build && pnpm preview:cf',
    url: `http://127.0.0.1:${PORT}/zh`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
});
```

`wrangler.jsonc` (no `routes` yet; the custom domain is attached in gated Task 16):

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "panspace-website",
  "compatibility_date": "2026-10-01",
  "preview_urls": true,
  "assets": {
    "directory": "./dist",
    "html_handling": "drop-trailing-slash",
    "not_found_handling": "404-page"
  }
}
```

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#07080a"/><path d="M9 22V10h7a4 4 0 0 1 0 8h-7" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

- [ ] **Step 4: Write the failing unit tests for storage and i18n helpers**

`tests/unit/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BOOT_KEY, LANG_KEY, safeGet, safeSet } from '../../src/lib/storage';

function memory(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}
const throwing = () => {
  throw new DOMException('blocked', 'SecurityError');
};

describe('storage keys', () => {
  it('are namespaced and stable', () => {
    expect(BOOT_KEY).toBe('panspace:boot-seen');
    expect(LANG_KEY).toBe('panspace:lang');
  });
});

describe('safeGet / safeSet', () => {
  it('round-trips through working storage', () => {
    const s = memory();
    expect(safeSet(() => s, 'k', 'v')).toBe(true);
    expect(safeGet(() => s, 'k')).toBe('v');
  });
  it('returns null / false when getting the storage object throws', () => {
    expect(safeGet(throwing, 'k')).toBeNull();
    expect(safeSet(throwing, 'k', 'v')).toBe(false);
  });
  it('returns null / false when the storage methods throw', () => {
    const bad = { getItem: throwing, setItem: throwing } as unknown as Storage;
    expect(safeGet(() => bad, 'k')).toBeNull();
    expect(safeSet(() => bad, 'k', 'v')).toBe(false);
  });
});
```

`tests/unit/i18n.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  HTML_LANG, LOCALES, isLocale, langPaths, localizedPath, normalizePath, otherLocale,
  pickLocale, stripLocale, switchLangPath,
} from '../../src/lib/i18n';

describe('locales', () => {
  it('has zh and en with BCP-47 html langs', () => {
    expect(LOCALES).toEqual(['zh', 'en']);
    expect(HTML_LANG).toEqual({ zh: 'zh-Hant', en: 'en' });
    expect(isLocale('zh')).toBe(true);
    expect(isLocale('ja')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(otherLocale('zh')).toBe('en');
    expect(otherLocale('en')).toBe('zh');
    expect(langPaths()).toEqual([{ params: { lang: 'zh' } }, { params: { lang: 'en' } }]);
  });
});

describe('normalizePath', () => {
  it.each([
    ['', '/'], ['/', '/'], ['work', '/work'], ['/work/', '/work'], ['/zh.html', '/zh'],
    ['/zh/work/ntutbox.html', '/zh/work/ntutbox'], ['/index.html', '/'], ['/zh/index.html', '/zh'],
  ])('%s -> %s', (input, expected) => expect(normalizePath(input)).toBe(expected));
});

describe('localizedPath', () => {
  it('prefixes the language and never adds a trailing slash', () => {
    expect(localizedPath('zh')).toBe('/zh');
    expect(localizedPath('en', '/')).toBe('/en');
    expect(localizedPath('zh', '/work')).toBe('/zh/work');
    expect(localizedPath('en', 'work/chippot/')).toBe('/en/work/chippot');
  });
});

describe('stripLocale', () => {
  it.each([
    ['/zh', 'zh', '/'], ['/zh/', 'zh', '/'], ['/zh.html', 'zh', '/'],
    ['/en/work/ntutbox', 'en', '/work/ntutbox'], ['/en/work/ntutbox/', 'en', '/work/ntutbox'],
    ['/zh/work/ntutbox.html', 'zh', '/work/ntutbox'], ['/', null, '/'], ['/zhx/work', null, '/zhx/work'],
  ])('%s -> lang %s path %s', (input, lang, path) => expect(stripLocale(input)).toEqual({ lang, path }));
});

describe('switchLangPath', () => {
  it('keeps the same page in the other language', () => {
    expect(switchLangPath('/zh/work/ntutbox', 'en')).toBe('/en/work/ntutbox');
    expect(switchLangPath('/en/about/', 'zh')).toBe('/zh/about');
    expect(switchLangPath('/zh.html', 'en')).toBe('/en');
  });
  it('falls back to the target home for language-less paths', () => {
    expect(switchLangPath('/nope', 'en')).toBe('/en');
  });
});

describe('pickLocale', () => {
  it('prefers a valid stored choice', () => {
    expect(pickLocale({ stored: 'zh', languages: ['en-US'] })).toBe('zh');
  });
  it('ignores an invalid stored value', () => {
    expect(pickLocale({ stored: 'fr', languages: ['zh-TW'] })).toBe('zh');
  });
  it('uses the first zh/en browser language', () => {
    expect(pickLocale({ stored: null, languages: ['ja-JP', 'zh-TW', 'en'] })).toBe('zh');
    expect(pickLocale({ stored: null, languages: ['EN-gb'] })).toBe('en');
    expect(pickLocale({ stored: null, languages: ['zh-Hans-CN'] })).toBe('zh');
  });
  it('falls back to en', () => {
    expect(pickLocale({ stored: null, languages: ['ja-JP'] })).toBe('en');
    expect(pickLocale({ stored: null, languages: [] })).toBe('en');
  });
});
```

- [ ] **Step 5: Run the unit tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, with `Failed to load url ../../src/lib/storage` (and `.../i18n`). The modules don't exist yet.

- [ ] **Step 6: Implement `src/lib/storage.ts` and `src/lib/i18n.ts`**

`src/lib/storage.ts`:

```ts
export const BOOT_KEY = 'panspace:boot-seen';
export const LANG_KEY = 'panspace:lang';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** Reads a key. Returns null when storage is missing, blocked, or throws. */
export function safeGet(getStorage: () => StorageLike, key: string): string | null {
  try {
    return getStorage().getItem(key);
  } catch {
    return null;
  }
}

/** Writes a key. Returns false instead of throwing when storage is unavailable. */
export function safeSet(getStorage: () => StorageLike, key: string, value: string): boolean {
  try {
    getStorage().setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
```

`src/lib/i18n.ts`:

```ts
export const LOCALES = ['zh', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export type Localized<T = string> = Record<Locale, T>;

export const DEFAULT_LOCALE: Locale = 'zh';
export const FALLBACK_LOCALE: Locale = 'en';
export const HTML_LANG: Record<Locale, string> = { zh: 'zh-Hant', en: 'en' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function otherLocale(lang: Locale): Locale {
  return lang === 'zh' ? 'en' : 'zh';
}

/** Leading slash, no trailing slash (except root), no `.html`, no trailing `index`. */
export function normalizePath(path: string): string {
  let p = path.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\.html$/, '');
  p = p.replace(/(^|\/)index$/, '$1');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

export function localizedPath(lang: Locale, path = '/'): string {
  const p = normalizePath(path);
  return p === '/' ? `/${lang}` : `/${lang}${p}`;
}

export function stripLocale(pathname: string): { lang: Locale | null; path: string } {
  const p = normalizePath(pathname);
  const [, first = '', ...rest] = p.split('/');
  if (isLocale(first)) return { lang: first, path: rest.length ? `/${rest.join('/')}` : '/' };
  return { lang: null, path: p };
}

export function switchLangPath(pathname: string, target: Locale): string {
  const { lang, path } = stripLocale(pathname);
  return localizedPath(target, lang ? path : '/');
}

export function pickLocale(input: { stored: string | null; languages: readonly string[] }): Locale {
  if (isLocale(input.stored)) return input.stored;
  for (const tag of input.languages) {
    const t = tag.toLowerCase();
    if (t.startsWith('zh')) return 'zh';
    if (t.startsWith('en')) return 'en';
  }
  return FALLBACK_LOCALE;
}

export function langPaths(): { params: { lang: Locale } }[] {
  return LOCALES.map((lang) => ({ params: { lang } }));
}
```

- [ ] **Step 7: Run the unit tests to verify they pass**

Run: `pnpm test`
Expected: PASS. `Test Files  2 passed (2)`.

- [ ] **Step 8: Write the root redirect page and a minimal language home**

`src/pages/index.astro`:

```astro
---
// Language redirector. Stored choice wins, then navigator.languages (the browser's
// Accept-Language list). Without JS the visitor picks a language from the links.
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pan's Space</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <script>
      import { pickLocale } from '../lib/i18n';
      import { LANG_KEY, safeGet } from '../lib/storage';

      const lang = pickLocale({
        stored: safeGet(() => window.localStorage, LANG_KEY),
        languages: navigator.languages?.length ? navigator.languages : [navigator.language],
      });
      window.location.replace(`/${lang}`);
    </script>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #07080a; color: #e7e9ee; font: 16px/1.6 system-ui, "PingFang TC", "Microsoft JhengHei", sans-serif; }
      a { color: #34d399; }
      ul { list-style: none; padding: 0; display: flex; gap: 24px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Pan's Space</h1>
      <ul>
        <li><a href="/zh" hreflang="zh-Hant" lang="zh-Hant">中文</a></li>
        <li><a href="/en" hreflang="en" lang="en">English</a></li>
      </ul>
    </main>
  </body>
</html>
```

`src/pages/[lang]/index.astro` (temporary; Task 3 replaces it):

```astro
---
import { HTML_LANG, langPaths, type Locale } from '../../lib/i18n';

export const getStaticPaths = langPaths;
const lang = Astro.params.lang as Locale;
---
<!doctype html>
<html lang={HTML_LANG[lang]}>
  <head><meta charset="utf-8" /><title>Pan's Space</title></head>
  <body><h1>Pan's Space</h1></body>
</html>
```

- [ ] **Step 9: Write the Playwright fixture and the failing root-redirect e2e test**

`tests/e2e/fixtures.ts`:

```ts
import { test as base, expect } from '@playwright/test';
import { BOOT_KEY } from '../../src/lib/storage';

type Options = { bootSeen: boolean };

export const test = base.extend<Options>({
  bootSeen: [true, { option: true }],
  page: async ({ page, bootSeen }, use) => {
    if (bootSeen) {
      await page.addInitScript((key) => {
        try {
          window.localStorage.setItem(key, '1');
        } catch {
          /* storage blocked in this test: fine */
        }
      }, BOOT_KEY);
    }
    await use(page);
  },
});

export { expect };

/** Makes every access to window.localStorage throw, like a blocked-storage browser. */
export const BLOCK_STORAGE = () => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('blocked', 'SecurityError');
    },
  });
};
```

`tests/e2e/root.spec.ts`:

```ts
import { BLOCK_STORAGE, expect, test } from './fixtures';
import { LANG_KEY } from '../../src/lib/storage';

test.describe('root language redirect', () => {
  test.describe('English browser', () => {
    test.use({ locale: 'en-US' });
    test('goes to /en', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/en$/);
    });
    test('a stored choice wins over the browser language', async ({ page }) => {
      await page.addInitScript((key) => window.localStorage.setItem(key, 'zh'), LANG_KEY);
      await page.goto('/');
      await expect(page).toHaveURL(/\/zh$/);
    });
  });

  test.describe('Traditional Chinese browser', () => {
    test.use({ locale: 'zh-TW' });
    test('goes to /zh', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/zh$/);
    });
    test('storage blocked: still uses the browser language', async ({ page }) => {
      await page.addInitScript(BLOCK_STORAGE);
      await page.goto('/');
      await expect(page).toHaveURL(/\/zh$/);
    });
  });

  test.describe('Japanese browser', () => {
    test.use({ locale: 'ja-JP' });
    test('falls back to /en', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/en$/);
    });
  });

  test.describe('JavaScript disabled', () => {
    test.use({ javaScriptEnabled: false });
    test('shows both language links', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: '中文' })).toHaveAttribute('href', '/zh');
      await expect(page.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en');
    });
  });
});

test('a trailing slash redirects to the canonical path', async ({ request }) => {
  const res = await request.get('/zh/', { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers()['location']).toMatch(/\/zh$/);
});

test('each language home responds 200', async ({ request }) => {
  for (const path of ['/zh', '/en']) expect((await request.get(path)).status()).toBe(200);
});
```

- [ ] **Step 10: Build and run the e2e tests**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: the build lists `/index.html`, `/zh.html`, `/en.html`. Playwright reports `16 passed` (8 tests × desktop + mobile).

(The test file and the pages were written together in Steps 8–9. To see the redirect tests fail first, delete the `<script>` block from `src/pages/index.astro`, run `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/root.spec.ts`, confirm the `toHaveURL` failures, then restore it.)

- [ ] **Step 11: Type-check**

Run: `pnpm check`
Expected: `0 errors`, `0 warnings`.

- [ ] **Step 12: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version .gitignore astro.config.mjs tsconfig.json vitest.config.ts playwright.config.ts wrangler.jsonc public/favicon.svg src/lib/storage.ts src/lib/i18n.ts src/pages/index.astro "src/pages/[lang]/index.astro" tests/unit/storage.test.ts tests/unit/i18n.test.ts tests/e2e/fixtures.ts tests/e2e/root.spec.ts
git commit -m "feat: scaffold Astro site with i18n helpers and root language redirect"
```

---
### Task 2: Content schemas, collections, project helpers, seed content, content policy

**Files:**
- Create: `src/lib/taxonomy.ts`, `src/lib/schemas.ts`, `src/lib/dates.ts`, `src/lib/projects.ts`, `src/lib/experience.ts`, `src/lib/content.ts`, `src/content.config.ts`
- Create: `src/content/profile.yaml`, `src/content/experience.yaml`, `src/content/awards.yaml`
- Create: `src/content/projects/{ntutbox,chippot,basketball-analysis}/{meta.yaml,zh.mdx,en.mdx,images/cover.png}`
- Create: `scripts/make-cover.mjs`, `scripts/content-policy.mjs`, `scripts/denylist-add.mjs`, `content-policy/denylist.json`
- Create: `tests/unit/schemas.test.ts`, `tests/unit/dates.test.ts`, `tests/unit/projects.test.ts`, `tests/unit/experience.test.ts`, `tests/unit/content-policy.test.ts`, `tests/unit/content-safety.test.ts`

**Interfaces:**
- Consumes: `Locale`, `Localized`, `LOCALES` from `src/lib/i18n.ts`.
- Produces:
  - `src/lib/taxonomy.ts` (zod-free, safe to import from client islands): `CATEGORIES`, `type Category = 'ios'|'web'|'ai'|'research'|'competition'`, `EXPERIENCE_TYPES`, `type ExperienceType = 'education'|'work'|'teaching'|'freelance'`
  - `src/lib/schemas.ts` (imports zod, so server/build only): re-exports the taxonomy, plus `ym`, `localized`, `projectMetaSchema(cover)`, `projectBodySchema`, `profileSchema(photo)`, `experienceSchema`, `awardSchema`
  - `src/lib/dates.ts`: `formatYm(ym: string): string` (`'2024-03'` → `'2024.03'`), `formatPeriod(start: string, end: string | undefined, lang: Locale): string`
  - `src/lib/projects.ts`: `ProjectLinks`, `LinkKind = 'appStore'|'website'|'demo'|'github'`, `ProjectMetaData<C>`, `BodyLike`, `Project<C, B extends BodyLike> = { slug; meta: ProjectMetaData<C>; text: Record<Locale, B> }`, `MissingTranslationError` (fields `slug`, `lang`), `assembleProjects(metas, bodies)`, `sortForList(items)`, `featuredForHome(items, limit = 5)`, `neighbors(ordered, slug): { prev; next }`, `visibleLinks(meta): { kind: LinkKind; href: string }[]`, `filterByCategory(items, key: Category | 'all')`
  - `src/lib/experience.ts`: `sortByStartDesc(items)`, `recentExperience(items, n = 5)`, `sortAwards(items)`, `awardYearRange(items): [number, number] | null`
  - `src/lib/content.ts`: `type ProjectEntry`, `type ProjectBodyEntry`, `type Profile`, `type Experience`, `type Award`, `getProjects(): Promise<ProjectEntry[]>` (already in list order), `getProfile()`, `getExperience()` (start desc), `getAwards()` (year desc)
  - Collections: `projectMeta` (id = slug), `projectBody` (id = `<slug>/<lang>`), `profile` (single entry), `experience`, `awards`
  - `scripts/content-policy.mjs`: `normalize`, `hashTerm`, `findDenylistHits(text, entries)`, `PHONE_RE`, `WEAK_METRIC_RE`, `ALLOWED_REPOS`, `findDisallowedRepoLinks(text, allowed?)`

- [ ] **Step 1: Write the failing schema tests**

`tests/unit/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import {
  awardSchema, experienceSchema, profileSchema, projectBodySchema, projectMetaSchema,
} from '../../src/lib/schemas';

const meta = projectMetaSchema(z.string());
const validMeta = {
  date: '2023-09',
  end: 'present',
  categories: ['ios', 'web'],
  stack: ['Swift'],
  role: { zh: '獨立開發', en: 'Solo developer' },
  links: { website: 'https://ntutbox.com' },
  featured: 1,
  bento: 'wide',
  cover: './images/cover.png',
  coverAlt: { zh: '封面', en: 'Cover' },
};

describe('projectMetaSchema', () => {
  it('accepts a complete meta and fills defaults', () => {
    const parsed = meta.parse({ ...validMeta, bento: undefined });
    expect(parsed.bento).toBe('regular');
    expect(parsed.confidential).toBe(false);
  });
  it('defaults links to an empty object', () => {
    expect(meta.parse({ ...validMeta, links: undefined }).links).toEqual({});
  });
  it.each([
    ['bad month', { date: '2023-13' }],
    ['bad end', { end: '2023/10' }],
    ['end before date', { end: '2023-01' }],
    ['unknown category', { categories: ['android'] }],
    ['empty categories', { categories: [] }],
    ['missing en role', { role: { zh: '獨立開發' } }],
    ['missing coverAlt', { coverAlt: undefined }],
    ['non-url link', { links: { website: 'ntutbox.com' } }],
    ['unknown key', { client: 'x' }],
    ['confidential with github', { confidential: true, links: { github: 'https://github.com/poterpan/x' } }],
  ])('rejects %s', (_name, patch) => {
    expect(meta.safeParse({ ...validMeta, ...patch }).success).toBe(false);
  });
});

describe('projectBodySchema', () => {
  it('requires a title and summary', () => {
    expect(projectBodySchema.safeParse({ title: 'T', summary: 'S' }).success).toBe(true);
    expect(projectBodySchema.safeParse({ title: 'T' }).success).toBe(false);
    expect(projectBodySchema.safeParse({ title: '', summary: 'S' }).success).toBe(false);
  });
});

describe('profileSchema', () => {
  const profile = profileSchema(z.string());
  const valid = {
    name: { zh: 'Poter Pan', en: 'Poter Pan' },
    tagline: { zh: 'a', en: 'b' },
    bio: { zh: 'a', en: 'b' },
    location: { zh: '台北', en: 'Taipei' },
    email: 'poter.pan@panspace.me',
    freelance: 'open',
    socials: { github: 'https://github.com/poterpan' },
    skills: [{ group: { zh: 'iOS', en: 'iOS' }, items: ['Swift'] }],
  };
  it('accepts a profile without linkedin or photo', () => {
    expect(profile.safeParse(valid).success).toBe(true);
  });
  it('rejects a bad email and an unknown freelance status', () => {
    expect(profile.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
    expect(profile.safeParse({ ...valid, freelance: 'maybe' }).success).toBe(false);
  });
});

describe('experienceSchema / awardSchema', () => {
  it('validates the experience type enum and dates', () => {
    const base = {
      id: 'ios-club-7', type: 'teaching', start: '2023-08', end: '2024-07',
      title: { zh: '社長', en: 'President' }, org: { zh: 'iOS Club', en: 'iOS Club' },
      description: { zh: 'a', en: 'b' },
    };
    expect(experienceSchema.safeParse(base).success).toBe(true);
    expect(experienceSchema.safeParse({ ...base, type: 'hobby' }).success).toBe(false);
    expect(experienceSchema.safeParse({ ...base, start: '2023-8' }).success).toBe(false);
  });
  it('validates awards', () => {
    const award = { id: 'a1', year: 2023, kind: 'award', name: { zh: '獎', en: 'Prize' } };
    expect(awardSchema.safeParse(award).success).toBe(true);
    expect(awardSchema.safeParse({ ...award, kind: 'medal' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/schemas.test.ts`
Expected: FAIL, `Failed to load url ../../src/lib/schemas`.

- [ ] **Step 3: Implement `src/lib/taxonomy.ts` and `src/lib/schemas.ts`**

`src/lib/taxonomy.ts`. Keep it free of zod: client islands import it, and zod must not reach the browser bundle.

```ts
export const CATEGORIES = ['ios', 'web', 'ai', 'research', 'competition'] as const;
export type Category = (typeof CATEGORIES)[number];

export const EXPERIENCE_TYPES = ['education', 'work', 'teaching', 'freelance'] as const;
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];
```

`src/lib/schemas.ts`:

```ts
import { z } from 'astro/zod';
import { CATEGORIES, EXPERIENCE_TYPES } from './taxonomy';

export { CATEGORIES, EXPERIENCE_TYPES, type Category, type ExperienceType } from './taxonomy';

export const ym = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');
const end = z.union([ym, z.literal('present')]);
export const localized = z.object({ zh: z.string().min(1), en: z.string().min(1) }).strict();

export function projectMetaSchema<C extends z.ZodType>(cover: C) {
  return z
    .object({
      date: ym,
      end: end.optional(),
      categories: z.array(z.enum(CATEGORIES)).min(1),
      stack: z.array(z.string().min(1)).min(1),
      role: localized,
      links: z
        .object({
          appStore: z.url().optional(),
          website: z.url().optional(),
          github: z.url().optional(),
          demo: z.url().optional(),
        })
        .strict()
        .default({}),
      featured: z.number().int().positive().optional(),
      bento: z.enum(['wide', 'regular']).default('regular'),
      cover,
      coverAlt: localized,
      confidential: z.boolean().default(false),
      listOrder: z.number().int().optional(),
    })
    .strict()
    .refine((m) => !m.end || m.end === 'present' || m.end >= m.date, {
      message: 'end must not be before date',
      path: ['end'],
    })
    .refine((m) => !(m.confidential && m.links.github), {
      message: 'confidential projects must not set links.github',
      path: ['links', 'github'],
    });
}

export const projectBodySchema = z
  .object({ title: z.string().min(1), summary: z.string().min(1).max(220) })
  .strict();

export function profileSchema<C extends z.ZodType>(photo: C) {
  return z
    .object({
      name: localized,
      tagline: localized,
      bio: localized,
      location: localized,
      email: z.email(),
      freelance: z.enum(['open', 'busy']),
      socials: z.object({ github: z.url(), linkedin: z.url().optional() }).strict(),
      skills: z
        .array(z.object({ group: localized, items: z.array(z.string().min(1)).min(1) }).strict())
        .min(1),
      photo: photo.optional(),
    })
    .strict();
}

export const experienceSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(EXPERIENCE_TYPES),
    start: ym,
    end: end.optional(),
    title: localized,
    org: localized,
    description: localized,
  })
  .strict();

export const awardSchema = z
  .object({
    id: z.string().min(1),
    year: z.number().int().min(2000).max(2100),
    kind: z.enum(['award', 'paper']),
    name: localized,
    rank: localized.optional(),
    org: localized.optional(),
  })
  .strict();
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test tests/unit/schemas.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Write failing tests for dates, projects and experience helpers**

`tests/unit/dates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatPeriod, formatYm } from '../../src/lib/dates';

describe('dates', () => {
  it('formats YYYY-MM', () => expect(formatYm('2024-03')).toBe('2024.03'));
  it('formats periods per language', () => {
    expect(formatPeriod('2024-03', undefined, 'zh')).toBe('2024.03');
    expect(formatPeriod('2024-03', 'present', 'zh')).toBe('2024.03 – 現在');
    expect(formatPeriod('2024-03', 'present', 'en')).toBe('2024.03 – Present');
    expect(formatPeriod('2023-08', '2024-07', 'en')).toBe('2023.08 – 2024.07');
    expect(formatPeriod('2023-08', '2023-08', 'en')).toBe('2023.08');
  });
});
```

`tests/unit/projects.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  MissingTranslationError, assembleProjects, featuredForHome, filterByCategory, neighbors,
  sortForList, visibleLinks, type ProjectMetaData,
} from '../../src/lib/projects';

function meta(patch: Partial<ProjectMetaData<string>> = {}): ProjectMetaData<string> {
  return {
    date: '2024-01', categories: ['web'], stack: ['TS'], role: { zh: '開發', en: 'Dev' },
    links: {}, bento: 'regular', cover: 'c.png', coverAlt: { zh: 'a', en: 'a' },
    confidential: false, ...patch,
  };
}
const body = (id: string) => ({ id, data: { title: id, summary: id } });

describe('assembleProjects', () => {
  it('pairs zh and en bodies with their meta', () => {
    const [p] = assembleProjects([{ id: 'a', data: meta() }], [body('a/zh'), body('a/en')]);
    expect(p?.slug).toBe('a');
    expect(p?.text.zh.id).toBe('a/zh');
    expect(p?.text.en.id).toBe('a/en');
  });
  it('throws MissingTranslationError naming the slug and language', () => {
    const run = () => assembleProjects([{ id: 'a', data: meta() }], [body('a/zh')]);
    expect(run).toThrow(MissingTranslationError);
    expect(run).toThrow('Project "a" is missing en.mdx');
  });
  it('throws for a body without meta', () => {
    expect(() => assembleProjects([], [body('ghost/zh')])).toThrow('ghost/zh.mdx without a matching ghost/meta.yaml');
  });
});

describe('sortForList', () => {
  const items = [
    { slug: 'old', meta: meta({ date: '2021-01' }) },
    { slug: 'tail-2', meta: meta({ date: '2025-01', listOrder: 2 }) },
    { slug: 'feat-2', meta: meta({ date: '2020-01', featured: 2 }) },
    { slug: 'new', meta: meta({ date: '2024-05' }) },
    { slug: 'tail-1', meta: meta({ date: '2019-01', listOrder: 1 }) },
    { slug: 'feat-1', meta: meta({ date: '2019-01', featured: 1 }) },
  ];
  it('orders featured, then by date desc, then listOrder items last', () => {
    expect(sortForList(items).map((p) => p.slug)).toEqual(['feat-1', 'feat-2', 'new', 'old', 'tail-1', 'tail-2']);
  });
  it('does not mutate its input', () => {
    const copy = [...items];
    sortForList(items);
    expect(items).toEqual(copy);
  });
  it('featuredForHome keeps featured only, in order, capped', () => {
    expect(featuredForHome(items).map((p) => p.slug)).toEqual(['feat-1', 'feat-2']);
    expect(featuredForHome(items, 1).map((p) => p.slug)).toEqual(['feat-1']);
  });
});

describe('neighbors', () => {
  const list = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];
  it('returns prev and next', () => {
    expect(neighbors(list, 'b')).toEqual({ prev: { slug: 'a' }, next: { slug: 'c' } });
    expect(neighbors(list, 'a')).toEqual({ prev: null, next: { slug: 'b' } });
    expect(neighbors(list, 'c')).toEqual({ prev: { slug: 'b' }, next: null });
    expect(neighbors(list, 'zzz')).toEqual({ prev: null, next: null });
  });
});

describe('visibleLinks', () => {
  const links = { github: 'https://github.com/poterpan/x', website: 'https://x.dev', appStore: 'https://apps.apple.com/x' };
  it('orders links and hides github for confidential projects', () => {
    expect(visibleLinks({ links, confidential: false }).map((l) => l.kind)).toEqual(['appStore', 'website', 'github']);
    expect(visibleLinks({ links, confidential: true }).map((l) => l.kind)).toEqual(['appStore', 'website']);
  });
});

describe('filterByCategory', () => {
  const items = [{ categories: ['ios', 'web'] as const }, { categories: ['ai'] as const }];
  it('filters by category and passes everything for all', () => {
    expect(filterByCategory([...items], 'ios')).toHaveLength(1);
    expect(filterByCategory([...items], 'all')).toHaveLength(2);
    expect(filterByCategory([...items], 'competition')).toHaveLength(0);
  });
});
```

`tests/unit/experience.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { awardYearRange, recentExperience, sortAwards, sortByStartDesc } from '../../src/lib/experience';

describe('experience helpers', () => {
  const items = [
    { id: 'b', start: '2023-08' }, { id: 'a', start: '2024-08' }, { id: 'c', start: '2022-08' },
    { id: 'd', start: '2024-08' }, { id: 'e', start: '2021-01' }, { id: 'f', start: '2020-01' },
  ];
  it('sorts by start desc with id as tie-breaker', () => {
    expect(sortByStartDesc(items).map((i) => i.id)).toEqual(['a', 'd', 'b', 'c', 'e', 'f']);
  });
  it('returns the n most recent', () => {
    expect(recentExperience(items, 5).map((i) => i.id)).toEqual(['a', 'd', 'b', 'c', 'e']);
  });
});

describe('award helpers', () => {
  const awards = [{ id: 'x', year: 2022 }, { id: 'y', year: 2024 }, { id: 'a', year: 2024 }];
  it('sorts by year desc, then id', () => {
    expect(sortAwards(awards).map((a) => a.id)).toEqual(['a', 'y', 'x']);
  });
  it('computes the year range', () => {
    expect(awardYearRange(awards)).toEqual([2022, 2024]);
    expect(awardYearRange([])).toBeNull();
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `pnpm test tests/unit/dates.test.ts tests/unit/projects.test.ts tests/unit/experience.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 7: Implement `dates.ts`, `projects.ts`, `experience.ts`**

`src/lib/dates.ts`:

```ts
import type { Locale } from './i18n';

const PRESENT: Record<Locale, string> = { zh: '現在', en: 'Present' };

export function formatYm(ym: string): string {
  return ym.replace('-', '.');
}

export function formatPeriod(start: string, end: string | undefined, lang: Locale): string {
  const from = formatYm(start);
  if (!end) return from;
  const to = end === 'present' ? PRESENT[lang] : formatYm(end);
  return to === from ? from : `${from} – ${to}`;
}
```

`src/lib/projects.ts`:

```ts
import { LOCALES, type Locale, type Localized } from './i18n';
import type { Category } from './taxonomy';

export interface ProjectLinks {
  appStore?: string;
  website?: string;
  github?: string;
  demo?: string;
}
export type LinkKind = 'appStore' | 'website' | 'demo' | 'github';

export interface ProjectMetaData<C> {
  date: string;
  end?: string;
  categories: Category[];
  stack: string[];
  role: Localized;
  links: ProjectLinks;
  featured?: number;
  bento: 'wide' | 'regular';
  cover: C;
  coverAlt: Localized;
  confidential: boolean;
  listOrder?: number;
}

export interface BodyLike {
  id: string;
  data: { title: string; summary: string };
}

export interface Project<C, B extends BodyLike> {
  slug: string;
  meta: ProjectMetaData<C>;
  text: Record<Locale, B>;
}

type Sortable = { slug: string; meta: { featured?: number; date: string; listOrder?: number } };

export class MissingTranslationError extends Error {
  readonly slug: string;
  readonly lang: Locale;
  constructor(slug: string, lang: Locale) {
    super(`Project "${slug}" is missing ${lang}.mdx (both zh.mdx and en.mdx are required).`);
    this.name = 'MissingTranslationError';
    this.slug = slug;
    this.lang = lang;
  }
}

export function assembleProjects<C, B extends BodyLike>(
  metas: { id: string; data: ProjectMetaData<C> }[],
  bodies: B[],
): Project<C, B>[] {
  const slugs = new Set(metas.map((m) => m.id));
  for (const b of bodies) {
    const slug = b.id.split('/')[0] ?? '';
    if (!slugs.has(slug)) throw new Error(`Found ${b.id}.mdx without a matching ${slug}/meta.yaml`);
  }
  const byId = new Map(bodies.map((b) => [b.id, b]));
  const projects = metas.map((m) => {
    const text = {} as Record<Locale, B>;
    for (const lang of LOCALES) {
      const found = byId.get(`${m.id}/${lang}`);
      if (!found) throw new MissingTranslationError(m.id, lang);
      text[lang] = found;
    }
    return { slug: m.id, meta: m.data, text };
  });
  return sortForList(projects);
}

/** Featured (by `featured` asc) → the rest by date desc → `listOrder` items last (by `listOrder` asc). */
export function sortForList<P extends Sortable>(items: readonly P[]): P[] {
  const rank = (p: P) => (p.meta.listOrder !== undefined ? 2 : p.meta.featured !== undefined ? 0 : 1);
  return [...items].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0 && a.meta.featured !== b.meta.featured) return (a.meta.featured ?? 0) - (b.meta.featured ?? 0);
    if (ra === 2 && a.meta.listOrder !== b.meta.listOrder) return (a.meta.listOrder ?? 0) - (b.meta.listOrder ?? 0);
    if (a.meta.date !== b.meta.date) return a.meta.date < b.meta.date ? 1 : -1;
    return a.slug.localeCompare(b.slug);
  });
}

export function featuredForHome<P extends Sortable>(items: readonly P[], limit = 5): P[] {
  return sortForList(items.filter((p) => p.meta.featured !== undefined && p.meta.listOrder === undefined)).slice(0, limit);
}

export function neighbors<P extends { slug: string }>(ordered: readonly P[], slug: string): { prev: P | null; next: P | null } {
  const i = ordered.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return { prev: ordered[i - 1] ?? null, next: ordered[i + 1] ?? null };
}

const LINK_ORDER: LinkKind[] = ['appStore', 'website', 'demo', 'github'];

export function visibleLinks(meta: { links: ProjectLinks; confidential: boolean }): { kind: LinkKind; href: string }[] {
  return LINK_ORDER.flatMap((kind) => {
    const href = meta.links[kind];
    if (!href || (kind === 'github' && meta.confidential)) return [];
    return [{ kind, href }];
  });
}

export function filterByCategory<T extends { categories: readonly Category[] }>(items: T[], key: Category | 'all'): T[] {
  return key === 'all' ? items : items.filter((i) => i.categories.includes(key));
}
```

`src/lib/experience.ts`:

```ts
export function sortByStartDesc<T extends { start: string; id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.start !== b.start ? (a.start < b.start ? 1 : -1) : a.id.localeCompare(b.id)));
}

export function recentExperience<T extends { start: string; id: string }>(items: readonly T[], n = 5): T[] {
  return sortByStartDesc(items).slice(0, n);
}

export function sortAwards<T extends { year: number; id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.year - a.year || a.id.localeCompare(b.id));
}

export function awardYearRange(items: readonly { year: number }[]): [number, number] | null {
  if (items.length === 0) return null;
  const years = items.map((i) => i.year);
  return [Math.min(...years), Math.max(...years)];
}
```

- [ ] **Step 8: Run to verify pass**

Run: `pnpm test`
Expected: PASS, all unit files green.

- [ ] **Step 9: Wire the collections**

`src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import {
  awardSchema, experienceSchema, profileSchema, projectBodySchema, projectMetaSchema,
} from './lib/schemas';

const projectMeta = defineCollection({
  loader: glob({
    pattern: '*/meta.yaml',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.split('/')[0] as string,
  }),
  schema: ({ image }) => projectMetaSchema(image()),
});

const projectBody = defineCollection({
  loader: glob({ pattern: '*/{zh,en}.mdx', base: './src/content/projects' }),
  schema: projectBodySchema,
});

const profile = defineCollection({
  loader: glob({ pattern: 'profile.yaml', base: './src/content' }),
  schema: ({ image }) => profileSchema(image()),
});

const experience = defineCollection({ loader: file('src/content/experience.yaml'), schema: experienceSchema });
const awards = defineCollection({ loader: file('src/content/awards.yaml'), schema: awardSchema });

export const collections = { projectMeta, projectBody, profile, experience, awards };
```

`src/lib/content.ts`:

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { sortAwards, sortByStartDesc } from './experience';
import { assembleProjects, type Project } from './projects';

export type ProjectBodyEntry = CollectionEntry<'projectBody'>;
export type ProjectEntry = Project<ImageMetadata, ProjectBodyEntry>;
export type Profile = CollectionEntry<'profile'>['data'];
export type Experience = CollectionEntry<'experience'>['data'];
export type Award = CollectionEntry<'awards'>['data'];

/** All projects in list order. Throws MissingTranslationError, which fails the build, if zh/en is missing. */
export async function getProjects(): Promise<ProjectEntry[]> {
  const [metas, bodies] = await Promise.all([getCollection('projectMeta'), getCollection('projectBody')]);
  return assembleProjects(metas, bodies);
}

export async function getProfile(): Promise<Profile> {
  const [entry] = await getCollection('profile');
  if (!entry) throw new Error('src/content/profile.yaml is missing');
  return entry.data;
}

export async function getExperience(): Promise<Experience[]> {
  return sortByStartDesc((await getCollection('experience')).map((e) => e.data));
}

export async function getAwards(): Promise<Award[]> {
  return sortAwards((await getCollection('awards')).map((e) => e.data));
}
```

- [ ] **Step 10: Write the cover generator and seed content**

`scripts/make-cover.mjs`:

```js
#!/usr/bin/env node
// Usage: node scripts/make-cover.mjs <out.png> [#hex] [label]
// Generates a 1600×900 placeholder cover. Real screenshots replace these in Task 14.
import sharp from 'sharp';

const [out, color = '#0f1b33', label = ''] = process.argv.slice(2);
if (!out) {
  console.error('usage: node scripts/make-cover.mjs <out.png> [#hex] [label]');
  process.exit(1);
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#101216"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  <text x="96" y="790" font-family="Menlo, monospace" font-size="56" fill="#e7e9ee">${esc(label)}</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`wrote ${out}`);
```

Run:

```bash
mkdir -p src/content/projects/ntutbox/images src/content/projects/chippot/images src/content/projects/basketball-analysis/images
node scripts/make-cover.mjs src/content/projects/ntutbox/images/cover.png '#0f1b33' '~/work/ntutbox'
node scripts/make-cover.mjs src/content/projects/chippot/images/cover.png '#3b0764' '~/work/chippot'
node scripts/make-cover.mjs src/content/projects/basketball-analysis/images/cover.png '#064e3b' '~/work/basketball-analysis'
```

Expected: three `wrote …/cover.png` lines.

`src/content/profile.yaml` (seed; Task 14 completes it):

```yaml
name: { zh: Poter Pan, en: Poter Pan }
tagline:
  zh: 把想法做成上線產品的開發者
  en: I build products that ship.
bio:
  zh: 我是 Poter，在台北念研究所，做 iOS、全端與 AI/CV。我喜歡把想法一路做到上線，從 App、網站到背後的服務都自己來。
  en: I'm Poter, a graduate student in Taipei working across iOS, full-stack and AI/CV. I like taking ideas all the way to production — the app, the website and the services behind them.
location: { zh: 台北, en: "Taipei, Taiwan" }
email: poter.pan@panspace.me
freelance: open
socials:
  github: https://github.com/poterpan
skills:
  - group: { zh: iOS, en: iOS }
    items: [Swift, SwiftUI]
  - group: { zh: Web, en: Web }
    items: [TypeScript, React, Next.js, Astro, Vue]
  - group: { zh: 雲端, en: Cloud }
    items: [Cloudflare Workers, D1, R2, Queues]
  - group: { zh: AI / CV, en: AI / CV }
    items: [PyTorch, YOLO, FastAPI]
```

`src/content/experience.yaml` (seed with the confirmed iOS Club facts from spec §6):

```yaml
- id: ios-club-teaching
  type: teaching
  start: "2022-08"
  end: "2023-07"
  title: { zh: 第 6 屆教學, en: Instructor (6th term) }
  org: { zh: iOS Club, en: iOS Club }
  description: { zh: 負責 iOS 開發課程教學。, en: "Taught the club's iOS development course." }
- id: ios-club-president
  type: teaching
  start: "2023-08"
  end: "2024-07"
  title: { zh: 第 7 屆社長, en: President (7th term) }
  org: { zh: iOS Club, en: iOS Club }
  description: { zh: 帶領社團規劃課程與活動。, en: "Led the club, planning courses and events." }
- id: ios-club-webmaster
  type: teaching
  start: "2024-08"
  end: "2025-07"
  title: { zh: 第 8 屆網管, en: Webmaster (8th term) }
  org: { zh: iOS Club, en: iOS Club }
  description: { zh: 維護社團網站與服務。, en: "Maintained the club's website and services." }
```

`src/content/awards.yaml`:

```yaml
[]
```

`src/content/projects/ntutbox/meta.yaml`:

```yaml
date: "2023-09"
end: present
categories: [ios, web]
stack: [Swift, SwiftUI, Next.js, Cloudflare Workers, D1]
role: { zh: 獨立開發, en: Solo developer }
links:
  website: https://ntutbox.com
featured: 1
bento: wide
cover: ./images/cover.png
coverAlt: { zh: NTUTBox 北科盒子封面, en: NTUTBox cover }
```

`src/content/projects/ntutbox/zh.mdx`:

```mdx
---
title: NTUTBox 北科盒子
summary: 已上架 App Store 的北科課表 App，以及一個人做出的官網、排課器、打卡系統與狀態頁。
---

## 背景與問題

北科學生查課表、排課需要在多個系統之間切換。

## 我的角色

獨立開發：產品設計、iOS App、網站與後端服務。

## 做法與技術決策

App 以 SwiftUI 開發，網站與服務部署在 Cloudflare。

## 成果

App 已上架 App Store，周邊服務持續營運中。

## 學到什麼

一個人維運一整套產品，需要把部署與監控自動化。
```

`src/content/projects/ntutbox/en.mdx`:

```mdx
---
title: NTUTBox
summary: A timetable app for NTUT students on the App Store, plus a website, course planner, check-in system and status page — all built solo.
---

## Background & problem

NTUT students juggle several systems to check timetables and plan courses.

## My role

Solo developer: product design, the iOS app, the website and the backend services.

## Approach & technical decisions

The app is built with SwiftUI; the website and services run on Cloudflare.

## Outcome

The app is live on the App Store and the surrounding services are in production.

## What I learned

Running a whole product alone means automating deployment and monitoring.
```

`src/content/projects/chippot/meta.yaml`:

```yaml
date: "2025-01"
categories: [web]
stack: [TypeScript, Cloudflare Workers, D1, R2, Discord]
role: { zh: 獨立開發, en: Solo developer }
links:
  github: https://github.com/poterpan/ChipPot
featured: 3
cover: ./images/cover.png
coverAlt: { zh: ChipPot 封面, en: ChipPot cover }
```

`src/content/projects/chippot/zh.mdx`:

```mdx
---
title: ChipPot
summary: 以 Discord 為介面、全 serverless 的社團共享 AI 訂閱帳務與對帳系統。
---

## 背景與問題

社團成員分攤 AI 訂閱費用，收款與對帳很瑣碎。

## 我的角色

獨立設計與開發。

## 做法與技術決策

以 Discord 作為操作介面，後端全部跑在 Cloudflare Workers、D1 與 R2。

## 成果

開源於 GitHub。

## 學到什麼

把帳務流程拆成可驗證的小步驟。
```

`src/content/projects/chippot/en.mdx`:

```mdx
---
title: ChipPot
summary: Discord-first subscription billing and reconciliation for clubs sharing AI subscriptions, fully serverless.
---

## Background & problem

Club members split AI subscription costs, and collecting and reconciling payments is tedious.

## My role

Designed and built it solo.

## Approach & technical decisions

Discord is the interface; the backend runs entirely on Cloudflare Workers, D1 and R2.

## Outcome

Open source on GitHub.

## What I learned

Breaking a billing flow into small, verifiable steps.
```

`src/content/projects/basketball-analysis/meta.yaml`:

```yaml
date: "2025-06"
end: present
categories: [ai, web]
stack: [PyTorch, FastAPI, React, Cloudflare Workers, Queues]
role: { zh: 技術負責人, en: Technical lead }
featured: 4
confidential: true
cover: ./images/cover.png
coverAlt: { zh: 籃球動作分析封面, en: Basketball motion analysis cover }
```

`src/content/projects/basketball-analysis/zh.mdx`:

```mdx
---
title: 籃球動作分析
summary: 從投籃影片偵測關鍵動作並產出分析報告的商業專案。
---

## 背景與問題

教練需要快速從影片中找出球員動作的關鍵影格。

## 我的角色

負責模型訓練管線、推論後端與網站。

## 做法與技術決策

關鍵影格偵測模型搭配佇列化的推論流程。

## 成果

系統已交付使用。

## 學到什麼

把研究模型包裝成可靠的線上服務。
```

`src/content/projects/basketball-analysis/en.mdx`:

```mdx
---
title: Basketball Motion Analysis
summary: A commercial project that detects key moments in shooting videos and produces analysis reports.
---

## Background & problem

Coaches need to find the key frames of a player's motion in video quickly.

## My role

Built the training pipeline, the inference backend and the website.

## Approach & technical decisions

A keyframe-detection model behind a queued inference pipeline.

## Outcome

The system has been delivered and is in use.

## What I learned

Turning a research model into a reliable online service.
```

- [ ] **Step 11: Verify collections load, then prove invalid content fails the build**

Run: `pnpm astro sync && pnpm check`
Expected: `Synced content` (no schema errors), then `0 errors`.

Temporarily change `date: "2023-09"` to `date: "2023-13"` in `src/content/projects/ntutbox/meta.yaml`, then run `pnpm astro sync`.
Expected: non-zero exit, with an error naming `projectMeta` → `ntutbox` → `date` → `expected YYYY-MM`. Restore `"2023-09"` and re-run `pnpm astro sync` (passes).

- [ ] **Step 12: Write the failing content-policy tests**

`tests/unit/content-policy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  PHONE_RE, WEAK_METRIC_RE, findDenylistHits, findDisallowedRepoLinks, hashTerm, normalize,
} from '../../scripts/content-policy.mjs';

describe('normalize / hashTerm', () => {
  it('is case-, width- and whitespace-insensitive', () => {
    expect(normalize('Ａｃｍｅ  Corp')).toBe('acmecorp');
    expect(hashTerm('ACME corp')).toEqual(hashTerm('acme  CORP'));
    expect(hashTerm('醫學中心').len).toBe(4);
  });
});

describe('findDenylistHits', () => {
  const entries = [hashTerm('acme corp'), hashTerm('某某醫院')];
  it('finds Latin and CJK terms regardless of spacing or case', () => {
    expect(findDenylistHits('We built this for ACME Corp.', entries)).toHaveLength(1);
    expect(findDenylistHits('與 某某 醫院 合作', entries)).toHaveLength(1);
  });
  it('returns no hits for clean text', () => {
    expect(findDenylistHits('與醫學中心合作', entries)).toEqual([]);
  });
});

describe('patterns', () => {
  it('detects Taiwanese mobile numbers', () => {
    expect('0912-345-678').toMatch(PHONE_RE);
    expect('+886 912 345 678').toMatch(PHONE_RE);
    expect('2024.03').not.toMatch(PHONE_RE);
  });
  it('detects install / download counts', () => {
    for (const s of ['1,200 次下載', '3k+ installs', '安裝數：500', '超過 2000 次安裝', '10K downloads']) {
      expect(s).toMatch(WEAK_METRIC_RE);
    }
    expect('3.3 萬筆開課資料').not.toMatch(WEAK_METRIC_RE);
  });
  it('allows only listed public repos', () => {
    expect(findDisallowedRepoLinks('https://github.com/poterpan/ChipPot and github.com/poterpan/locmotion')).toEqual([]);
    expect(findDisallowedRepoLinks('https://github.com/poterpan/some-script')).toEqual(['some-script']);
  });
});
```

`tests/unit/content-safety.test.ts`:

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PHONE_RE, WEAK_METRIC_RE, findDenylistHits, findDisallowedRepoLinks,
} from '../../scripts/content-policy.mjs';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
  );
}

const denylist = JSON.parse(readFileSync('content-policy/denylist.json', 'utf8')) as {
  entries: { len: number; sha256: string }[];
};
const files = walk('src/content').filter((f) => /\.(ya?ml|mdx?)$/.test(f));

describe('content policy (all files under src/content)', () => {
  it('finds content files', () => expect(files.length).toBeGreaterThan(0));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    it(`${file}: no denylisted terms`, () => expect(findDenylistHits(text, denylist.entries)).toEqual([]));
    it(`${file}: no phone numbers`, () => expect(text).not.toMatch(PHONE_RE));
    it(`${file}: no install/download counts`, () => expect(text).not.toMatch(WEAK_METRIC_RE));
    it(`${file}: only allow-listed GitHub repos`, () => expect(findDisallowedRepoLinks(text)).toEqual([]));
  }
});
```

- [ ] **Step 13: Run to verify failure**

Run: `pnpm test tests/unit/content-policy.test.ts tests/unit/content-safety.test.ts`
Expected: FAIL, `Failed to load url ../../scripts/content-policy.mjs`.

- [ ] **Step 14: Implement the policy module, denylist file and CLI**

`scripts/content-policy.mjs`:

```js
import { createHash } from 'node:crypto';

/** Public repos that may be linked from content. Anything else is rejected (grey-area and private repos included). */
export const ALLOWED_REPOS = [
  'chippot', 'locmotion', 'ntutbox-course', 'ntutbox-website', 'ntutbox-checkin', 'ntutbox-template-api',
  'taipei-traffic-risk-map', 'ntut-ar-campus-tour', 'asr-server', 'incognitoearth', 'baemoments', 'poterpan',
  'panspace-website',
];

export const PHONE_RE = /(?:\+?886[-\s]?|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}/;
export const WEAK_METRIC_RE =
  /\d[\d,.]*\s*[kK萬千]?\+?\s*次?\s*(?:下載|安裝|installs?|downloads?)|(?:下載|安裝)(?:數|次數|量)\s*[:：]?\s*\d/i;

/** @param {string} text */
export function normalize(text) {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

/** @param {string} s */
function sha256(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** @param {string} term @returns {{ len: number, sha256: string }} */
export function hashTerm(term) {
  const n = normalize(term);
  return { len: [...n].length, sha256: sha256(n) };
}

/**
 * Slides a window of each denylisted length over the normalized text and compares hashes.
 * Returns positions only, never the matched text.
 * @param {string} text @param {{ len: number, sha256: string }[]} entries
 */
export function findDenylistHits(text, entries) {
  const chars = [...normalize(text)];
  /** @type {Map<number, Set<string>>} */
  const byLen = new Map();
  for (const e of entries) {
    if (!byLen.has(e.len)) byLen.set(e.len, new Set());
    byLen.get(e.len)?.add(e.sha256);
  }
  /** @type {{ index: number, len: number }[]} */
  const hits = [];
  for (const [len, hashes] of byLen) {
    for (let i = 0; i + len <= chars.length; i++) {
      if (hashes.has(sha256(chars.slice(i, i + len).join('')))) hits.push({ index: i, len });
    }
  }
  return hits;
}

/** @param {string} text @param {string[]} [allowed] */
export function findDisallowedRepoLinks(text, allowed = ALLOWED_REPOS) {
  return [...text.matchAll(/github\.com\/poterpan\/([A-Za-z0-9_.-]+)/gi)]
    .map((m) => (m[1] ?? '').replace(/\.git$/, ''))
    .filter((repo) => !allowed.includes(repo.toLowerCase()));
}
```

`content-policy/denylist.json`:

```json
{ "entries": [] }
```

`scripts/denylist-add.mjs`:

```js
#!/usr/bin/env node
// Usage: node scripts/denylist-add.mjs '<term>'
// Stores only {len, sha256} of the normalized term. Never prints or commits the term itself.
import { readFileSync, writeFileSync } from 'node:fs';
import { hashTerm } from './content-policy.mjs';

const term = process.argv[2];
if (!term) {
  console.error("usage: node scripts/denylist-add.mjs '<term>'");
  process.exit(1);
}
const path = 'content-policy/denylist.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
const entry = hashTerm(term);
if (data.entries.some((e) => e.sha256 === entry.sha256)) {
  console.log(`already present (len ${entry.len})`);
} else {
  data.entries.push(entry);
  data.entries.sort((a, b) => a.len - b.len || a.sha256.localeCompare(b.sha256));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`added (len ${entry.len}); ${data.entries.length} entries total`);
}
```

- [ ] **Step 15: Seed the denylist with the basketball client's identifier (without writing it anywhere)**

Run:

```bash
gh repo list poterpan --limit 300 --json name -q '.[].name' | grep -i basketball
```

The token before `-basketball` in those repo names identifies the client. Add it, and its spelled-out form if you know it, with:

```bash
node scripts/denylist-add.mjs '<that token>'
```

Expected: `added (len N); 1 entries total`. Do **not** paste the token into the plan, tests, commit message or chat summary.

- [ ] **Step 16: Run all unit tests**

Run: `pnpm test`
Expected: PASS. Every `content-safety` case is green for all 12 seed files.

- [ ] **Step 17: Commit**

```bash
git add src/lib/taxonomy.ts src/lib/schemas.ts src/lib/dates.ts src/lib/projects.ts src/lib/experience.ts src/lib/content.ts src/content.config.ts src/content/profile.yaml src/content/experience.yaml src/content/awards.yaml src/content/projects/ntutbox src/content/projects/chippot src/content/projects/basketball-analysis scripts/make-cover.mjs scripts/content-policy.mjs scripts/denylist-add.mjs content-policy/denylist.json tests/unit/schemas.test.ts tests/unit/dates.test.ts tests/unit/projects.test.ts tests/unit/experience.test.ts tests/unit/content-policy.test.ts tests/unit/content-safety.test.ts
git commit -m "feat: add content collections, schemas, seed content and content policy checks"
```

---
### Task 3: Design tokens, fonts, UI strings, base layout, navigation and language switch

**Files:**
- Create: `src/styles/global.css`, `src/i18n/ui.ts`, `src/lib/seo.ts`, `src/layouts/BaseLayout.astro`
- Create: `src/components/SeoHead.astro`, `src/components/Nav.astro`, `src/components/LangSwitch.astro`, `src/components/Footer.astro`
- Create: `src/scripts/global.ts`, `src/scripts/lang-memory.ts`
- Create: `tests/unit/ui.test.ts`, `tests/unit/seo.test.ts`, `tests/e2e/routes.ts`, `tests/e2e/routes.spec.ts`, `tests/e2e/nav.spec.ts`
- Modify: `astro.config.mjs` (add Fonts API), `src/pages/[lang]/index.astro` (use the layout)

**Interfaces:**
- Consumes: `src/lib/i18n.ts` (all), `src/lib/storage.ts` (`LANG_KEY`, `safeSet`), `src/lib/content.ts` (`getProfile`), `Category`/`ExperienceType` from `src/lib/taxonomy.ts`, `sortForList`/`featuredForHome` from `src/lib/projects.ts`.
- Produces:
  - `src/i18n/ui.ts`: `ui`, `type UiKey`, `t(lang, key): string`, `format(template, vars): string`, `categoryLabel(lang, c: Category)`, `experienceTypeLabel(lang, type: ExperienceType)`. **Every UI string the site needs is defined here now.** Later tasks only consume keys.
  - `src/lib/seo.ts`: `SITE = 'https://panspace.me'`, `canonicalUrl(lang, path): string`, `alternateLinks(path): { hreflang: 'zh-Hant'|'en'|'x-default'; href: string }[]`
  - `src/layouts/BaseLayout.astro` props: `{ lang: Locale; path: string | null; title: string; description: string; noindex?: boolean }`. `path` is the language-less route (`'/'`, `'/work'`, `'/work/ntutbox'`, `'/about'`); `null` means a page with no language twin (404). Named slot `head` for page-specific head content.
  - `Nav.astro` renders `<button data-palette-open class="kbd-hint" hidden>` (revealed by Task 11) and `a[data-lang-switch="<other>"]`.
  - Global CSS classes: `.mono-path`, `.status-dot`, `.kbd`, `.skip-link`, `.section`, `.section-title`, `.container-ps`
  - `tests/e2e/routes.ts`: `projectMetas()`, `orderedSlugs()`, `featuredSlugs()`, `STATIC_PATHS`, `allPaths()`. Later tasks extend `allPaths()`.

- [ ] **Step 1: Write failing unit tests for UI strings and SEO link helpers**

`tests/unit/ui.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { categoryLabel, experienceTypeLabel, format, t, ui } from '../../src/i18n/ui';

describe('ui strings', () => {
  it('zh and en define exactly the same non-empty keys', () => {
    expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.zh).sort());
    for (const lang of ['zh', 'en'] as const) {
      for (const [key, value] of Object.entries(ui[lang])) expect(value, `${lang}.${key}`).not.toBe('');
    }
  });
  it('translates and formats', () => {
    expect(t('zh', 'nav.work')).toBe('作品');
    expect(t('en', 'nav.work')).toBe('Work');
    expect(format(t('en', 'work.count'), { n: 3 })).toBe('3 projects');
    expect(categoryLabel('zh', 'ai')).toBe('AI/CV');
    expect(experienceTypeLabel('en', 'teaching')).toBe('Teaching & community');
  });
});
```

`tests/unit/seo.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SITE, alternateLinks, canonicalUrl } from '../../src/lib/seo';

describe('canonical and alternates', () => {
  it('builds absolute canonical URLs without trailing slashes', () => {
    expect(SITE).toBe('https://panspace.me');
    expect(canonicalUrl('zh', '/')).toBe('https://panspace.me/zh');
    expect(canonicalUrl('en', '/work/ntutbox')).toBe('https://panspace.me/en/work/ntutbox');
  });
  it('lists zh-Hant, en and x-default', () => {
    expect(alternateLinks('/about')).toEqual([
      { hreflang: 'zh-Hant', href: 'https://panspace.me/zh/about' },
      { hreflang: 'en', href: 'https://panspace.me/en/about' },
      { hreflang: 'x-default', href: 'https://panspace.me/' },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/ui.test.ts tests/unit/seo.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `src/i18n/ui.ts` and `src/lib/seo.ts`**

`src/i18n/ui.ts`:

```ts
import type { Locale } from '../lib/i18n';
import type { Category, ExperienceType } from '../lib/taxonomy';

const zh = {
  'meta.siteName': "Pan's Space",
  'a11y.skip': '跳到主要內容',
  'nav.label': '主要導覽',
  'nav.home': '首頁',
  'nav.work': '作品',
  'nav.about': '關於我',
  'lang.switchTo': 'English',
  'home.title': '產品型開發者',
  'home.bentoLabel': '精選概覽',
  'home.experience': '近期經歷',
  'home.experienceMore': '完整經歷 →',
  'bento.awards': '獎項與論文',
  'bento.stack': '技術',
  'status.open': '開放接案中',
  'status.busy': '目前檔期已滿',
  'contact.title': '聯絡',
  'contact.email': 'Email',
  'contact.copyEmail': '複製 email',
  'contact.copied': '已複製',
  'contact.resume': '下載履歷（PDF）',
  'contact.github': 'GitHub',
  'contact.linkedin': 'LinkedIn',
  'work.title': '作品',
  'work.description': '我做過的產品、研究與競賽作品。',
  'work.filterLabel': '依類別篩選',
  'work.count': '共 {n} 個作品',
  'work.filter.all': '全部',
  'work.filter.ios': 'iOS',
  'work.filter.web': 'Web',
  'work.filter.ai': 'AI/CV',
  'work.filter.research': '研究',
  'work.filter.competition': '競賽',
  'project.details': '專案資訊',
  'project.role': '角色',
  'project.period': '期間',
  'project.stack': '技術',
  'project.toc': '本頁目錄',
  'project.confidential': '商業專案・客戶資訊保密',
  'project.prev': '← 上一個作品',
  'project.next': '下一個作品 →',
  'project.links.appStore': 'App Store',
  'project.links.website': '網站',
  'project.links.github': 'GitHub',
  'project.links.demo': 'Demo',
  'about.title': '關於我',
  'about.timeline': '經歷',
  'about.filterLabel': '依類型篩選',
  'about.filter.all': '全部',
  'about.awards': '獎項與論文',
  'about.skills': '技能',
  'exp.education': '學歷',
  'exp.work': '工作',
  'exp.teaching': '教學與社群',
  'exp.freelance': '接案',
  'award.award': '獎項',
  'award.paper': '論文',
  'palette.title': '指令面板',
  'palette.open': '開啟指令面板',
  'palette.placeholder': '跳到…（作品、頁面或指令）',
  'palette.listLabel': '結果',
  'palette.empty': '沒有符合的項目',
  'palette.home': '首頁',
  'palette.work': '作品列表',
  'palette.about': '關於我',
  'palette.switchLang': '切換到 English',
  'palette.copyEmail': '複製 email',
  'palette.resume': '下載履歷',
  'palette.github': '開啟 GitHub',
  'palette.linkedin': '開啟 LinkedIn',
  'palette.copied': '已複製 email',
  'palette.action': '動作',
  'notFound.title': '找不到頁面',
  'footer.source': '原始碼',
} as const;

export type UiKey = keyof typeof zh;
type UiDict = { [K in UiKey]: string };

const en: UiDict = {
  'meta.siteName': "Pan's Space",
  'a11y.skip': 'Skip to content',
  'nav.label': 'Main',
  'nav.home': 'Home',
  'nav.work': 'Work',
  'nav.about': 'About',
  'lang.switchTo': '中文',
  'home.title': 'Product-minded developer',
  'home.bentoLabel': 'Highlights',
  'home.experience': 'Recent experience',
  'home.experienceMore': 'Full experience →',
  'bento.awards': 'Awards & papers',
  'bento.stack': 'Stack',
  'status.open': 'Open for freelance',
  'status.busy': 'Currently booked',
  'contact.title': 'Contact',
  'contact.email': 'Email',
  'contact.copyEmail': 'Copy email',
  'contact.copied': 'Copied',
  'contact.resume': 'Download résumé (PDF)',
  'contact.github': 'GitHub',
  'contact.linkedin': 'LinkedIn',
  'work.title': 'Work',
  'work.description': 'Products, research and competition work I have built.',
  'work.filterLabel': 'Filter by category',
  'work.count': '{n} projects',
  'work.filter.all': 'All',
  'work.filter.ios': 'iOS',
  'work.filter.web': 'Web',
  'work.filter.ai': 'AI/CV',
  'work.filter.research': 'Research',
  'work.filter.competition': 'Competition',
  'project.details': 'Project details',
  'project.role': 'Role',
  'project.period': 'Period',
  'project.stack': 'Stack',
  'project.toc': 'On this page',
  'project.confidential': 'Commercial project · client details confidential',
  'project.prev': '← Previous project',
  'project.next': 'Next project →',
  'project.links.appStore': 'App Store',
  'project.links.website': 'Website',
  'project.links.github': 'GitHub',
  'project.links.demo': 'Demo',
  'about.title': 'About',
  'about.timeline': 'Experience',
  'about.filterLabel': 'Filter by type',
  'about.filter.all': 'All',
  'about.awards': 'Awards & papers',
  'about.skills': 'Skills',
  'exp.education': 'Education',
  'exp.work': 'Work',
  'exp.teaching': 'Teaching & community',
  'exp.freelance': 'Freelance',
  'award.award': 'Award',
  'award.paper': 'Paper',
  'palette.title': 'Command palette',
  'palette.open': 'Open command palette',
  'palette.placeholder': 'Jump to… (projects, pages, actions)',
  'palette.listLabel': 'Results',
  'palette.empty': 'No matches',
  'palette.home': 'Home',
  'palette.work': 'All work',
  'palette.about': 'About',
  'palette.switchLang': 'Switch to 中文',
  'palette.copyEmail': 'Copy email',
  'palette.resume': 'Download résumé',
  'palette.github': 'Open GitHub',
  'palette.linkedin': 'Open LinkedIn',
  'palette.copied': 'Email copied',
  'palette.action': 'action',
  'notFound.title': 'Page not found',
  'footer.source': 'Source',
};

export const ui: Record<Locale, UiDict> = { zh, en };

export function t(lang: Locale, key: UiKey): string {
  return ui[lang][key];
}

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? `{${k}}`));
}

export function categoryLabel(lang: Locale, c: Category): string {
  return t(lang, `work.filter.${c}`);
}

export function experienceTypeLabel(lang: Locale, type: ExperienceType): string {
  return t(lang, `exp.${type}`);
}
```

`src/lib/seo.ts`:

```ts
import { localizedPath, type Locale } from './i18n';

export const SITE = 'https://panspace.me';

export function canonicalUrl(lang: Locale, path: string): string {
  return `${SITE}${localizedPath(lang, path)}`;
}

export function alternateLinks(path: string): { hreflang: 'zh-Hant' | 'en' | 'x-default'; href: string }[] {
  return [
    { hreflang: 'zh-Hant', href: canonicalUrl('zh', path) },
    { hreflang: 'en', href: canonicalUrl('en', path) },
    { hreflang: 'x-default', href: `${SITE}/` },
  ];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test tests/unit/ui.test.ts tests/unit/seo.test.ts`
Expected: PASS.

- [ ] **Step 5: Add self-hosted fonts to `astro.config.mjs`**

Replace the file with:

```js
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://panspace.me',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [react(), mdx()],
  fonts: [
    {
      name: 'Geist',
      cssVariable: '--font-geist',
      provider: fontProviders.local(),
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          { weight: '100 900', style: 'normal', src: ['./node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'] },
        ],
      },
    },
    {
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      provider: fontProviders.local(),
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          { weight: '100 900', style: 'normal', src: ['./node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2'] },
        ],
      },
    },
  ],
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 6: Write the global stylesheet**

`src/styles/global.css` (later tasks append their own clearly headed sections to this file):

```css
@import "tailwindcss";

@theme {
  --color-bg: #07080a;
  --color-card: #101216;
  --color-line: #1f232b;
  --color-line-strong: #3b4250;
  --color-text: #e7e9ee;
  --color-muted: #8a909c;
  --color-accent: #34d399;
  --color-accent-2: #60a5fa;
  --color-warn: #fbbf24;
  --radius-card: 16px;
}

@theme inline {
  --font-sans: var(--font-geist), "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, "SFMono-Regular", Menlo, monospace;
}

@layer base {
  html {
    color-scheme: dark;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-sans);
    -webkit-text-size-adjust: 100%;
  }
  body {
    min-height: 100dvh;
    margin: 0;
    background-image:
      linear-gradient(#ffffff07 1px, transparent 1px),
      linear-gradient(90deg, #ffffff07 1px, transparent 1px);
    background-size: 28px 28px;
    line-height: 1.6;
  }
  a { color: inherit; }
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 3px;
    border-radius: 6px;
  }
  ::selection { background: #34d39955; }
  main:focus { outline: none; }
}

/* ---------- layout primitives ---------- */
.container-ps { width: min(1120px, 100% - 32px); margin-inline: auto; }
.section { padding-block: 48px; }
.section-title { font-size: 1.25rem; font-weight: 650; margin: 0 0 16px; }
.mono-path { font-family: var(--font-mono); font-size: 12px; color: var(--color-muted); letter-spacing: 0.01em; }
.kbd { display: inline-flex; gap: 2px; font: 11px var(--font-mono); color: var(--color-muted); }
.kbd kbd { border: 1px solid var(--color-line); border-radius: 4px; padding: 1px 5px; background: #14171c; color: var(--color-text); }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); box-shadow: 0 0 10px var(--color-accent); margin-right: 8px; }
.status-dot[data-status="busy"] { background: var(--color-warn); box-shadow: 0 0 10px var(--color-warn); }
@media (prefers-reduced-motion: no-preference) {
  .status-dot { animation: ps-pulse 1.8s infinite; }
}
@keyframes ps-pulse { 50% { opacity: 0.35; } }

.skip-link {
  position: absolute; left: 16px; top: -100px; z-index: 200;
  background: var(--color-card); border: 1px solid var(--color-accent); border-radius: 8px; padding: 8px 12px;
}
.skip-link:focus { top: 16px; }

/* ---------- nav ---------- */
.site-nav { position: sticky; top: 0; z-index: 40; backdrop-filter: blur(8px); background: #07080acc; border-bottom: 1px solid var(--color-line); }
.site-nav nav { display: flex; align-items: center; gap: 16px; height: 56px; }
.site-nav ul { display: flex; gap: 16px; list-style: none; margin: 0; padding: 0; }
.site-nav a { text-decoration: none; color: var(--color-muted); }
.site-nav a:hover, .site-nav a[aria-current="page"] { color: var(--color-text); }
.site-nav .brand { font-family: var(--font-mono); color: var(--color-text); }
.site-nav .nav-end { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.kbd-hint { background: none; border: 0; padding: 4px; cursor: pointer; }

/* ---------- footer ---------- */
.site-footer { border-top: 1px solid var(--color-line); padding-block: 24px; margin-top: 64px; }
```

- [ ] **Step 7: Write the layout, head, nav, language switch, footer and client scripts**

`src/components/SeoHead.astro`:

```astro
---
import { alternateLinks, canonicalUrl } from '../lib/seo';
import type { Locale } from '../lib/i18n';

interface Props {
  lang: Locale;
  path: string | null;
  title: string;
  description: string;
  noindex: boolean;
}
const { lang, path, title, description, noindex } = Astro.props;
---
<title>{title}</title>
<meta name="description" content={description} />
{noindex && <meta name="robots" content="noindex" />}
{path !== null && <link rel="canonical" href={canonicalUrl(lang, path)} />}
{path !== null && alternateLinks(path).map((l) => <link rel="alternate" hreflang={l.hreflang} href={l.href} />)}
```

`src/components/LangSwitch.astro`:

```astro
---
import { HTML_LANG, localizedPath, otherLocale, type Locale } from '../lib/i18n';
import { t } from '../i18n/ui';

interface Props { lang: Locale; path: string }
const { lang, path } = Astro.props;
const other = otherLocale(lang);
---
<a href={localizedPath(other, path)} hreflang={HTML_LANG[other]} lang={HTML_LANG[other]} data-lang-switch={other} class="mono-path">
  {t(lang, 'lang.switchTo')}
</a>
```

`src/components/Nav.astro`:

```astro
---
import { localizedPath, type Locale } from '../lib/i18n';
import { t } from '../i18n/ui';
import LangSwitch from './LangSwitch.astro';

interface Props { lang: Locale; path: string | null }
const { lang, path } = Astro.props;
const links = [
  { href: localizedPath(lang, '/work'), label: t(lang, 'nav.work'), active: path?.startsWith('/work') ?? false },
  { href: localizedPath(lang, '/about'), label: t(lang, 'nav.about'), active: path === '/about' },
];
---
<header class="site-nav">
  <nav class="container-ps" aria-label={t(lang, 'nav.label')}>
    <a class="brand" href={localizedPath(lang, '/')} aria-current={path === '/' ? 'page' : undefined}>~/panspace</a>
    <ul>
      {links.map((l) => <li><a href={l.href} aria-current={l.active ? 'page' : undefined}>{l.label}</a></li>)}
    </ul>
    <div class="nav-end">
      <button type="button" class="kbd-hint kbd" data-palette-open hidden aria-label={t(lang, 'palette.open')}>
        <kbd>⌘</kbd><kbd>K</kbd>
      </button>
      {path !== null && <LangSwitch lang={lang} path={path} />}
    </div>
  </nav>
</header>
```

`src/components/Footer.astro`:

```astro
---
import type { Locale } from '../lib/i18n';
import { t } from '../i18n/ui';
import { getProfile } from '../lib/content';

interface Props { lang: Locale }
const { lang } = Astro.props;
const profile = await getProfile();
---
<footer class="site-footer">
  <div class="container-ps mono-path">
    © {new Date().getFullYear()} {profile.name[lang]} ·
    <a href="https://github.com/poterpan/panspace-website">{t(lang, 'footer.source')}</a>
  </div>
</footer>
```

`src/scripts/lang-memory.ts`:

```ts
import { isLocale } from '../lib/i18n';
import { LANG_KEY, safeSet } from '../lib/storage';

// Remember an explicit language choice so `/` honours it next time.
document.addEventListener('click', (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-lang-switch]');
  const target = link?.dataset.langSwitch;
  if (isLocale(target)) safeSet(() => window.localStorage, LANG_KEY, target);
});
```

`src/scripts/global.ts`:

```ts
import './lang-memory';

declare global {
  interface Window {
    __psNavigated?: boolean;
  }
}

// Set on any client-side navigation. The boot sequence (Task 6) never plays after one.
document.addEventListener('astro:before-preparation', () => {
  window.__psNavigated = true;
});
```

`src/layouts/BaseLayout.astro`:

```astro
---
import { ClientRouter } from 'astro:transitions';
import { Font } from 'astro:assets';
import '../styles/global.css';
import SeoHead from '../components/SeoHead.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import { HTML_LANG, type Locale } from '../lib/i18n';
import { t } from '../i18n/ui';

interface Props {
  lang: Locale;
  path: string | null;
  title: string;
  description: string;
  noindex?: boolean;
}
const { lang, path, title, description, noindex = false } = Astro.props;
---
<!doctype html>
<html lang={HTML_LANG[lang]} data-lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#07080a" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <SeoHead lang={lang} path={path} title={title} description={description} noindex={noindex} />
    <Font cssVariable="--font-geist" preload />
    <Font cssVariable="--font-geist-mono" />
    <ClientRouter />
    <slot name="head" />
  </head>
  <body>
    <a class="skip-link" href="#main">{t(lang, 'a11y.skip')}</a>
    <Nav lang={lang} path={path} />
    <main id="main" tabindex="-1" class="container-ps">
      <slot />
    </main>
    <Footer lang={lang} />
    <script>
      import '../scripts/global';
    </script>
  </body>
</html>
```

`src/pages/[lang]/index.astro` (temporary body; Task 4 replaces it):

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { langPaths, type Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import { getProfile } from '../../lib/content';

export const getStaticPaths = langPaths;
const lang = Astro.params.lang as Locale;
const profile = await getProfile();
---
<BaseLayout lang={lang} path="/" title={`${profile.name[lang]} — ${t(lang, 'home.title')}`} description={profile.tagline[lang]}>
  <h1>{profile.name[lang]}</h1>
</BaseLayout>
```

- [ ] **Step 8: Write the e2e route helper and the failing layout/navigation tests**

`tests/e2e/routes.ts`:

```ts
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { featuredForHome, sortForList } from '../../src/lib/projects';

export interface MetaLite {
  slug: string;
  meta: { date: string; featured?: number; listOrder?: number; categories: string[]; confidential?: boolean };
}

export function projectMetas(): MetaLite[] {
  const root = 'src/content/projects';
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(`${root}/${d.name}/meta.yaml`))
    .map((d) => ({ slug: d.name, meta: parse(readFileSync(`${root}/${d.name}/meta.yaml`, 'utf8')) as MetaLite['meta'] }));
}

export const orderedSlugs = (): string[] => sortForList(projectMetas()).map((p) => p.slug);
export const featuredSlugs = (): string[] => featuredForHome(projectMetas()).map((p) => p.slug);

/** Language-less paths that exist. Later tasks add '/work', project pages and '/about'. */
export const STATIC_PATHS = ['/'];
export function allPaths(): string[] {
  return [...STATIC_PATHS];
}
```

`tests/e2e/routes.spec.ts`:

```ts
import { expect, test } from './fixtures';
import { allPaths } from './routes';
import { LOCALES, localizedPath } from '../../src/lib/i18n';

for (const lang of LOCALES) {
  for (const path of allPaths()) {
    const url = localizedPath(lang, path);
    test(`${url} responds 200`, async ({ request }) => {
      expect((await request.get(url)).status()).toBe(200);
    });
  }
}
```

`tests/e2e/nav.spec.ts`:

```ts
import { expect, test } from './fixtures';
import { allPaths } from './routes';
import { localizedPath } from '../../src/lib/i18n';
import { LANG_KEY } from '../../src/lib/storage';

const SITE = 'https://panspace.me';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const path of allPaths()) {
  test(`canonical and hreflang on ${path}`, async ({ page }) => {
    await page.goto(localizedPath('zh', path));
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}${localizedPath('zh', path)}`);
    const alternates = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((els) => els.map((e) => [e.getAttribute('hreflang'), e.getAttribute('href')]));
    expect(alternates).toEqual([
      ['zh-Hant', `${SITE}${localizedPath('zh', path)}`],
      ['en', `${SITE}${localizedPath('en', path)}`],
      ['x-default', `${SITE}/`],
    ]);
  });

  test(`language switch stays on ${path} and is remembered`, async ({ page }) => {
    await page.goto(localizedPath('zh', path));
    await page.locator('a[data-lang-switch="en"]').click();
    await expect(page).toHaveURL(new RegExp(`${escape(localizedPath('en', path))}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await page.evaluate((k) => localStorage.getItem(k), LANG_KEY)).toBe('en');
    await page.locator('a[data-lang-switch="zh"]').click();
    await expect(page).toHaveURL(new RegExp(`${escape(localizedPath('zh', path))}$`));
  });
}

test.describe('remembered language', () => {
  test.use({ locale: 'zh-TW' });
  test('an explicit switch to English wins at /', async ({ page }) => {
    await page.goto('/zh');
    await page.locator('a[data-lang-switch="en"]').click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
  });
});

test('skip link is the first tab stop and moves focus to main', async ({ page }) => {
  await page.goto('/zh');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test('focused links show a visible focus ring', async ({ page }) => {
  await page.goto('/zh');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(outline).not.toBe('none');
});
```

- [ ] **Step 9: Build and run all tests**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: `0 errors` from check. All unit tests pass. The build output contains `/_astro/fonts/` woff2 files. Playwright passes everything (`root`, `routes`, `nav` on desktop and mobile).

(The new specs fail if you run them before Step 7: `.skip-link` and `a[data-lang-switch]` don't exist yet. Task 7 extends `allPaths()`, which makes `nav.spec.ts` also prove the switch stays on project pages.)

- [ ] **Step 10: Commit**

```bash
git add astro.config.mjs src/styles/global.css src/i18n/ui.ts src/lib/seo.ts src/layouts/BaseLayout.astro src/components/SeoHead.astro src/components/Nav.astro src/components/LangSwitch.astro src/components/Footer.astro src/scripts/global.ts src/scripts/lang-memory.ts "src/pages/[lang]/index.astro" tests/unit/ui.test.ts tests/unit/seo.test.ts tests/e2e/routes.ts tests/e2e/routes.spec.ts tests/e2e/nav.spec.ts
git commit -m "feat: add base layout, design tokens, fonts, navigation and language switch"
```

---
### Task 4: Homepage — static Bento, experience snippet, contact (works without JS)

**Files:**
- Create: `src/lib/resume.ts`, `src/scripts/copy-email.ts`, `src/components/ContactSection.astro`
- Create: `src/components/home/BentoGrid.astro`, `HeroCard.astro`, `ProjectCard.astro`, `AwardsCard.astro`, `StackCard.astro`, `StatusBar.astro`, `ExperienceSnippet.astro`
- Create: `tests/unit/resume.test.ts`, `tests/e2e/home.spec.ts`
- Modify: `src/pages/[lang]/index.astro`, `src/scripts/global.ts`, `src/styles/global.css` (append "Bento" and "home sections")

**Interfaces:**
- Consumes: `getProjects`, `getProfile`, `getExperience`, `getAwards`, `ProjectEntry`, `Profile`, `Experience` (Task 2); `featuredForHome` (Task 2); `recentExperience`, `awardYearRange` (Task 2); `formatPeriod` (Task 2); `t`, `categoryLabel`, `experienceTypeLabel` (Task 3); `BaseLayout` (Task 3); `featuredSlugs()` (Task 3 e2e helper).
- Produces:
  - `src/lib/resume.ts`: `resumeHref(lang: Locale, exists?: (p: string) => boolean, publicDir?: string): string | null`
  - `ProjectCard.astro` props `{ lang: Locale; project: ProjectEntry; slot: 'p1'|'p2'|'p3'|'p4'|'p5'; eager?: boolean }`. It renders `<a class="bento-card project-card" data-spotlight data-slot>` containing `h2.card-title` and `picture` with `img.card-cover` (Task 8 adds view-transition classes).
  - Every Bento card element carries `data-spotlight` (consumed by Task 5).
  - `ContactSection.astro` props `{ lang: Locale; profile: Profile }`, rendered as `<section id="contact">`. It contains `button[data-copy-email]` (hidden until JS) and the résumé link only when `resumeHref` is non-null.
  - Home page markup: `section.bento` with `grid-template-areas` `hero p1..p5 awards stack status`.

- [ ] **Step 1: Write the failing résumé helper test**

`tests/unit/resume.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resumeHref } from '../../src/lib/resume';

describe('resumeHref', () => {
  it('returns the public URL only when the PDF exists', () => {
    const exists = (p: string) => p === 'public/resume-zh.pdf';
    expect(resumeHref('zh', exists)).toBe('/resume-zh.pdf');
    expect(resumeHref('en', exists)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/resume.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/resume.ts`**

```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Locale } from './i18n';

/** `/resume-<lang>.pdf` when `public/resume-<lang>.pdf` exists at build time, else null (entry hidden). */
export function resumeHref(
  lang: Locale,
  exists: (path: string) => boolean = existsSync,
  publicDir = 'public',
): string | null {
  const file = `resume-${lang}.pdf`;
  return exists(join(publicDir, file)) ? `/${file}` : null;
}
```

Run: `pnpm test tests/unit/resume.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing homepage e2e test**

`tests/e2e/home.spec.ts`:

```ts
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
```

(The last step clicks through to a project page, which only exists after Task 7. Until then the target is a 404, but the assertion only checks the URL, so the test passes.)

- [ ] **Step 5: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/home.spec.ts`
Expected: FAIL. `.bento-hero h1` is not found (the home page still has the temporary body).

- [ ] **Step 6: Append Bento and home-section CSS to `src/styles/global.css`**

```css
/* ---------- Bento ---------- */
.bento {
  display: grid;
  gap: 12px;
  margin-top: 24px;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "hero" "p1" "p2" "p3" "p4" "p5" "awards" "stack" "status";
}
@media (min-width: 640px) {
  .bento {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas: "hero hero" "p1 p1" "p2 p3" "p4 p5" "awards stack" "status status";
  }
}
@media (min-width: 1024px) {
  .bento {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: minmax(190px, auto);
    grid-template-areas:
      "hero hero p1 p1"
      "hero hero p2 p3"
      "awards stack p4 p5"
      "status status status status";
  }
}
.bento-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  background: var(--color-card);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
  padding: 18px;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s;
}
a.bento-card:hover { border-color: var(--color-line-strong); }
.bento-hero { grid-area: hero; min-height: 320px; justify-content: flex-end; }
.bento-hero h1 { font-size: clamp(2rem, 5vw, 3rem); font-weight: 750; letter-spacing: -0.02em; line-height: 1.1; margin: 8px 0; }
.bento-hero .tagline { color: var(--color-muted); font-size: 1.125rem; margin: 0; }
.project-card { min-height: 190px; }
.project-card[data-slot="p1"] { min-height: 280px; }
.card-title { font-size: 1rem; font-weight: 650; margin: 0; }
.card-summary { font-size: 0.875rem; color: var(--color-muted); margin: 0; }
.card-cover { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 10px; border: 1px solid var(--color-line); margin-top: auto; }
.project-card[data-bento="regular"] .card-cover { aspect-ratio: 16 / 7; }
.awards-card { grid-area: awards; }
.stack-card { grid-area: stack; }
.big-number { font-size: 2rem; font-weight: 700; line-height: 1; }
.status-bar { grid-area: status; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 8px 20px; }
.status-bar a { color: var(--color-muted); }
.status-bar a:hover { color: var(--color-text); }

/* ---------- home sections ---------- */
.timeline-mini { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.timeline-mini li { display: grid; grid-template-columns: 9.5rem 1fr; gap: 12px; }
@media (max-width: 639.98px) { .timeline-mini li { grid-template-columns: 1fr; gap: 0; } }
.more-link { display: inline-block; margin-top: 16px; color: var(--color-accent); text-decoration: none; }
.contact-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.contact-list button { font: inherit; font-size: 0.875rem; color: var(--color-text); background: #16191f; border: 1px solid var(--color-line); border-radius: 8px; padding: 4px 10px; cursor: pointer; margin-left: 8px; }
```

- [ ] **Step 7: Write the home components**

`src/components/home/HeroCard.astro`:

```astro
---
import { localizedPath, type Locale } from '../../lib/i18n';
import type { Profile } from '../../lib/content';

interface Props { lang: Locale; profile: Profile }
const { lang, profile } = Astro.props;
---
<a href={localizedPath(lang, '/about')} class="bento-card bento-hero" data-spotlight>
  <span class="mono-path">~/panspace · $ whoami</span>
  <h1>{profile.name[lang]}</h1>
  <p class="tagline">{profile.tagline[lang]}</p>
  <p class="mono-path">{profile.location[lang]}</p>
</a>
```

`src/components/home/ProjectCard.astro`:

```astro
---
import { Picture } from 'astro:assets';
import { localizedPath, type Locale } from '../../lib/i18n';
import { categoryLabel } from '../../i18n/ui';
import type { ProjectEntry } from '../../lib/content';

interface Props {
  lang: Locale;
  project: ProjectEntry;
  slot: 'p1' | 'p2' | 'p3' | 'p4' | 'p5';
  eager?: boolean;
}
const { lang, project, slot, eager = false } = Astro.props;
const text = project.text[lang].data;
const wide = project.meta.bento === 'wide';
const first = project.meta.categories[0];
---
<a
  href={localizedPath(lang, `/work/${project.slug}`)}
  class="bento-card project-card"
  data-slot={slot}
  data-bento={project.meta.bento}
  data-spotlight
  style={`grid-area:${slot}`}
>
  <span class="mono-path">{first ? `${categoryLabel(lang, first)} · ` : ''}~/work/{project.slug}</span>
  <h2 class="card-title">{text.title}</h2>
  <p class="card-summary">{text.summary}</p>
  <Picture
    src={project.meta.cover}
    alt={project.meta.coverAlt[lang]}
    formats={['avif', 'webp']}
    widths={wide ? [480, 800, 1200] : [360, 640]}
    sizes={wide ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'}
    loading={eager ? 'eager' : 'lazy'}
    fetchpriority={eager ? 'high' : 'auto'}
    class="card-cover"
  />
</a>
```

`src/components/home/AwardsCard.astro`:

```astro
---
import { localizedPath, type Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';

interface Props { lang: Locale; count: number; years: [number, number] | null }
const { lang, count, years } = Astro.props;
---
<a href={`${localizedPath(lang, '/about')}#awards`} class="bento-card awards-card" data-spotlight>
  <span class="mono-path">{t(lang, 'bento.awards')}</span>
  <strong class="big-number">{count}</strong>
  {years && <span class="mono-path">{years[0] === years[1] ? years[0] : `${years[0]} – ${years[1]}`}</span>}
</a>
```

`src/components/home/StackCard.astro`:

```astro
---
import { localizedPath, type Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import type { Profile } from '../../lib/content';

interface Props { lang: Locale; skills: Profile['skills'] }
const { lang, skills } = Astro.props;
const preview = skills.flatMap((g) => g.items.slice(0, 2)).slice(0, 8);
---
<a href={`${localizedPath(lang, '/about')}#skills`} class="bento-card stack-card" data-spotlight>
  <span class="mono-path">{t(lang, 'bento.stack')}</span>
  <p class="mono-path" style="color: var(--color-text); line-height: 1.8; margin: 0">{preview.join(' · ')}</p>
</a>
```

`src/components/home/StatusBar.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import type { Profile } from '../../lib/content';

interface Props { lang: Locale; profile: Profile }
const { lang, profile } = Astro.props;
---
<div class="bento-card status-bar" data-spotlight>
  <span><span class="status-dot" data-status={profile.freelance} aria-hidden="true"></span>{t(lang, profile.freelance === 'open' ? 'status.open' : 'status.busy')}</span>
  <a href={`mailto:${profile.email}`}>{profile.email}</a>
  <a href={profile.socials.github} rel="me noopener" target="_blank">{t(lang, 'contact.github')}</a>
  {profile.socials.linkedin && <a href={profile.socials.linkedin} rel="me noopener" target="_blank">{t(lang, 'contact.linkedin')}</a>}
</div>
```

`src/components/home/BentoGrid.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import type { Profile, ProjectEntry } from '../../lib/content';
import HeroCard from './HeroCard.astro';
import ProjectCard from './ProjectCard.astro';
import AwardsCard from './AwardsCard.astro';
import StackCard from './StackCard.astro';
import StatusBar from './StatusBar.astro';

interface Props {
  lang: Locale;
  profile: Profile;
  featured: ProjectEntry[];
  awardsCount: number;
  awardYears: [number, number] | null;
}
const { lang, profile, featured, awardsCount, awardYears } = Astro.props;
const SLOTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
---
<section class="bento" aria-label={t(lang, 'home.bentoLabel')}>
  <HeroCard lang={lang} profile={profile} />
  {featured.slice(0, SLOTS.length).map((project, i) => (
    <ProjectCard lang={lang} project={project} slot={SLOTS[i]!} eager={i === 0} />
  ))}
  <AwardsCard lang={lang} count={awardsCount} years={awardYears} />
  <StackCard lang={lang} skills={profile.skills} />
  <StatusBar lang={lang} profile={profile} />
</section>
```

`src/components/home/ExperienceSnippet.astro`:

```astro
---
import { localizedPath, type Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import { formatPeriod } from '../../lib/dates';
import type { Experience } from '../../lib/content';

interface Props { lang: Locale; items: Experience[] }
const { lang, items } = Astro.props;
---
<section id="experience" class="section" aria-labelledby="experience-title">
  <h2 id="experience-title" class="section-title">{t(lang, 'home.experience')}</h2>
  <ol class="timeline-mini">
    {items.map((item) => (
      <li>
        <span class="mono-path">{formatPeriod(item.start, item.end, lang)}</span>
        <span><strong>{item.title[lang]}</strong> · {item.org[lang]}</span>
      </li>
    ))}
  </ol>
  <a class="more-link" href={`${localizedPath(lang, '/about')}#timeline`}>{t(lang, 'home.experienceMore')}</a>
</section>
```

`src/components/ContactSection.astro`:

```astro
---
import type { Locale } from '../lib/i18n';
import { t } from '../i18n/ui';
import { resumeHref } from '../lib/resume';
import type { Profile } from '../lib/content';

interface Props { lang: Locale; profile: Profile }
const { lang, profile } = Astro.props;
const resume = resumeHref(lang);
---
<section id="contact" class="section" aria-labelledby="contact-title">
  <h2 id="contact-title" class="section-title">{t(lang, 'contact.title')}</h2>
  <ul class="contact-list">
    <li>
      <span class="mono-path">{t(lang, 'contact.email')}</span>
      <a href={`mailto:${profile.email}`}>{profile.email}</a>
      <button type="button" data-copy-email={profile.email} data-copied-label={t(lang, 'contact.copied')} hidden>
        {t(lang, 'contact.copyEmail')}
      </button>
      <span class="mono-path" data-copy-status role="status" aria-live="polite"></span>
    </li>
    {resume && <li><a href={resume} download>{t(lang, 'contact.resume')}</a></li>}
    <li><a href={profile.socials.github} rel="me noopener" target="_blank">{t(lang, 'contact.github')}</a></li>
    {profile.socials.linkedin && <li><a href={profile.socials.linkedin} rel="me noopener" target="_blank">{t(lang, 'contact.linkedin')}</a></li>}
  </ul>
</section>
```

`src/scripts/copy-email.ts`:

```ts
// Progressive enhancement: reveal "copy email" buttons only when the Clipboard API exists.
function bind(): void {
  if (!navigator.clipboard) return;
  document.querySelectorAll<HTMLButtonElement>('button[data-copy-email]').forEach((button) => {
    button.hidden = false;
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', async () => {
      const status = button.parentElement?.querySelector<HTMLElement>('[data-copy-status]');
      try {
        await navigator.clipboard.writeText(button.dataset.copyEmail ?? '');
        if (status) {
          status.textContent = button.dataset.copiedLabel ?? '';
          window.setTimeout(() => {
            status.textContent = '';
          }, 2000);
        }
      } catch {
        // Clipboard denied: the mailto link next to the button still works.
      }
    });
  });
}

document.addEventListener('astro:page-load', bind);
```

Modify `src/scripts/global.ts`: add `import './copy-email';` directly below `import './lang-memory';`.

`src/pages/[lang]/index.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import BentoGrid from '../../components/home/BentoGrid.astro';
import ExperienceSnippet from '../../components/home/ExperienceSnippet.astro';
import ContactSection from '../../components/ContactSection.astro';
import { langPaths, type Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import { getAwards, getExperience, getProfile, getProjects } from '../../lib/content';
import { featuredForHome } from '../../lib/projects';
import { awardYearRange, recentExperience } from '../../lib/experience';

export const getStaticPaths = langPaths;
const lang = Astro.params.lang as Locale;
const [projects, profile, experience, awards] = await Promise.all([getProjects(), getProfile(), getExperience(), getAwards()]);
---
<BaseLayout lang={lang} path="/" title={`${profile.name[lang]} — ${t(lang, 'home.title')}`} description={profile.tagline[lang]}>
  <BentoGrid
    lang={lang}
    profile={profile}
    featured={featuredForHome(projects)}
    awardsCount={awards.length}
    awardYears={awardYearRange(awards)}
  />
  <ExperienceSnippet lang={lang} items={recentExperience(experience, 5)} />
  <ContactSection lang={lang} profile={profile} />
</BaseLayout>
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: `0 errors`; all unit tests pass; all e2e tests pass (the `home.spec.ts` layout tests skip on the other project).

- [ ] **Step 9: Commit**

```bash
git add src/lib/resume.ts src/scripts/copy-email.ts src/scripts/global.ts src/components/ContactSection.astro src/components/home "src/pages/[lang]/index.astro" src/styles/global.css tests/unit/resume.test.ts tests/e2e/home.spec.ts
git commit -m "feat: build the static Bento homepage with experience and contact sections"
```

---
### Task 5: Spotlight glow and 3D tilt

**Files:**
- Create: `src/lib/tilt.ts`, `src/scripts/spotlight.ts`, `tests/unit/tilt.test.ts`, `tests/e2e/spotlight.spec.ts`
- Modify: `src/scripts/global.ts`, `src/styles/global.css` (append "spotlight")

**Interfaces:**
- Consumes: elements with `[data-spotlight]` (Task 4; Task 9 adds them to `/work` cards).
- Produces: `src/lib/tilt.ts`: `TILT_RANGE_DEG = 7`, `type Tilt = { rotateX: number; rotateY: number }`, `tiltFor(x, y, width, height, range = TILT_RANGE_DEG): Tilt`, `tiltTransform(t: Tilt): string`. At runtime, a hovered card gets inline `--mx`, `--my` and `transform`.

Behavior, matching the approved prototype: on `pointer: fine` without reduced motion, the pointer moves a radial glow (border ring and soft fill) and tilts the card. The rotation spans 7° in total (±3.5° at the edges), so it never exceeds the spec's ≤ 7° in any direction. On `pointer: coarse` without reduced motion, pressing scales the card to 0.98. Under reduced motion both are off.

- [ ] **Step 1: Write the failing tilt math test**

`tests/unit/tilt.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TILT_RANGE_DEG, tiltFor, tiltTransform } from '../../src/lib/tilt';

describe('tiltFor', () => {
  it('is flat at the center', () => {
    expect(tiltFor(50, 50, 100, 100)).toEqual({ rotateX: 0, rotateY: 0 });
  });
  it('tilts toward the pointer, ±range/2 at the edges', () => {
    expect(tiltFor(100, 0, 100, 100)).toEqual({ rotateX: 3.5, rotateY: 3.5 });
    expect(tiltFor(0, 100, 100, 100)).toEqual({ rotateX: -3.5, rotateY: -3.5 });
  });
  it('never exceeds 7 degrees, even outside the card', () => {
    for (const [x, y] of [[-500, -500], [900, 900], [100, -20]]) {
      const t = tiltFor(x!, y!, 100, 100);
      expect(Math.abs(t.rotateX)).toBeLessThanOrEqual(TILT_RANGE_DEG);
      expect(Math.abs(t.rotateY)).toBeLessThanOrEqual(TILT_RANGE_DEG);
    }
  });
  it('handles zero-size boxes', () => {
    expect(tiltFor(10, 10, 0, 0)).toEqual({ rotateX: 0, rotateY: 0 });
  });
  it('builds a CSS transform', () => {
    expect(tiltTransform({ rotateX: 1.5, rotateY: -2 })).toBe('perspective(700px) rotateX(1.5deg) rotateY(-2deg) translateZ(4px)');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/tilt.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/tilt.ts`**

```ts
export const TILT_RANGE_DEG = 7;
export type Tilt = { rotateX: number; rotateY: number };

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const round = (v: number) => Math.round(v * 100) / 100 || 0; // `|| 0` turns -0 into 0

/** Pointer position inside a box → rotation. Total span is `range` degrees (±range/2 at the edges). */
export function tiltFor(x: number, y: number, width: number, height: number, range = TILT_RANGE_DEG): Tilt {
  if (width <= 0 || height <= 0) return { rotateX: 0, rotateY: 0 };
  const nx = clamp01(x / width) - 0.5;
  const ny = clamp01(y / height) - 0.5;
  return { rotateX: round(-ny * range), rotateY: round(nx * range) };
}

export function tiltTransform(t: Tilt): string {
  return `perspective(700px) rotateX(${t.rotateX}deg) rotateY(${t.rotateY}deg) translateZ(4px)`;
}
```

Run: `pnpm test tests/unit/tilt.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing e2e test**

`tests/e2e/spotlight.spec.ts`:

```ts
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
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/spotlight.spec.ts`
Expected: FAIL. The desktop poll times out waiting for `rotateY(`, and the mobile poll never reaches `matrix(0.98…)`.

- [ ] **Step 6: Implement the runtime and CSS**

`src/scripts/spotlight.ts` uses event delegation on `document`, so cards that React re-creates (the `/work` filter in Task 9) and cards swapped in by client-side navigation work without re-binding:

```ts
import { tiltFor, tiltTransform } from '../lib/tilt';

const finePointer = window.matchMedia('(pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let current: HTMLElement | null = null;

function reset(el: HTMLElement): void {
  el.style.transform = '';
  el.style.removeProperty('--mx');
  el.style.removeProperty('--my');
}

document.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches) return;
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-spotlight]') ?? null;
    if (current && current !== el) reset(current);
    current = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty('--mx', `${x}px`);
    el.style.setProperty('--my', `${y}px`);
    el.style.transform = tiltTransform(tiltFor(x, y, r.width, r.height));
  },
  { passive: true },
);

// Pointer left the window entirely.
document.addEventListener('pointerout', (e) => {
  if (!e.relatedTarget && current) {
    reset(current);
    current = null;
  }
});
```

Modify `src/scripts/global.ts`: add `import './spotlight';` below `import './copy-email';`.

Append to `src/styles/global.css`:

```css
/* ---------- spotlight ---------- */
@media (pointer: fine) and (prefers-reduced-motion: no-preference) {
  [data-spotlight] { transform-style: preserve-3d; transition: transform 0.25s ease-out, border-color 0.2s; will-change: transform; }
  [data-spotlight]::before {
    content: ""; position: absolute; inset: -1px; border-radius: inherit; padding: 1px; pointer-events: none;
    background: radial-gradient(260px circle at var(--mx, -999px) var(--my, -999px), #34d399aa, transparent 45%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }
  [data-spotlight]::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(320px circle at var(--mx, -999px) var(--my, -999px), #34d39914, transparent 50%);
  }
}
@media (pointer: coarse) and (prefers-reduced-motion: no-preference) {
  [data-spotlight] { transition: transform 0.15s ease-out; }
  [data-spotlight]:active { transform: scale(0.98); }
}
```

- [ ] **Step 7: Run tests to verify pass**

Run: `pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: all pass (each spotlight test runs on its own project and skips on the other).

- [ ] **Step 8: Commit**

```bash
git add src/lib/tilt.ts src/scripts/spotlight.ts src/scripts/global.ts src/styles/global.css tests/unit/tilt.test.ts tests/e2e/spotlight.spec.ts
git commit -m "feat: add spotlight glow and tilt to Bento cards"
```

---

### Task 6: First-visit boot sequence

**Files:**
- Create: `src/lib/boot.ts`, `src/components/home/BootOverlay.astro`, `src/scripts/boot.ts`, `tests/unit/boot.test.ts`, `tests/e2e/boot.spec.ts`
- Modify: `src/pages/[lang]/index.astro`, `src/styles/global.css` (append "boot")

**Interfaces:**
- Consumes: `BOOT_KEY`, `safeSet` (Task 1); `window.__psNavigated` (set in `src/scripts/global.ts`, Task 3); `featuredForHome` (Task 2); `BaseLayout` named slot `head` (Task 3).
- Produces: `src/lib/boot.ts`: `BOOT_MAX_MS = 2500`, `FOLD_MS = 400`, `type BootLine = { kind: 'cmd' | 'out'; text: string }`, `type BootStep = { lineIndex: number; at: number; duration: number }`, `bootGate(win): boolean`, `bootGateScript(): string`, `bootLines(name: string, slugs: string[]): BootLine[]`, `buildBootTimeline(lines, opts?): { steps: BootStep[]; foldAt: number; totalMs: number }`. DOM contract: `<html data-boot="play" | "folding" | "done">`, `#boot.boot` overlay with `.boot-line[data-kind][data-index]`.

How it works:
1. A tiny inline script in `<head>` (generated from `bootGate.toString()`) runs before first paint. It sets `html[data-boot="play"]` only when all of these hold: no client-side navigation has happened (`window.__psNavigated`); no reduced motion; the referrer is not another page of this site (the root `/` redirector doesn't count); `localStorage` is readable and has no `panspace:boot-seen`. Any exception → no boot.
2. CSS shows the opaque, fixed `#boot` overlay only while `data-boot` is `play` or `folding`. The Bento HTML is fully rendered underneath, so SEO and LCP measure real content.
3. The bundled `src/scripts/boot.ts` reveals the lines on the timeline, folds at `foldAt`, finishes at `totalMs` ≤ 2500 ms, and writes `panspace:boot-seen` (a write failure is ignored). Any key or pointer press finishes immediately.

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/boot.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BOOT_MAX_MS, bootGate, bootGateScript, bootLines, buildBootTimeline } from '../../src/lib/boot';
import { BOOT_KEY } from '../../src/lib/storage';

type FakeWin = Parameters<typeof bootGate>[0];
function win(overrides: { navigated?: boolean; reduced?: boolean; referrer?: string; seen?: string | null; throws?: boolean } = {}): FakeWin {
  const { navigated = false, reduced = false, referrer = '', seen = null, throws = false } = overrides;
  return {
    __psNavigated: navigated,
    matchMedia: () => ({ matches: reduced }),
    document: { referrer },
    location: { origin: 'https://panspace.me' },
    get localStorage() {
      if (throws) throw new DOMException('blocked', 'SecurityError');
      return { getItem: (k: string) => (k === BOOT_KEY ? seen : null) };
    },
  } as unknown as FakeWin;
}

describe('bootGate', () => {
  it('plays on a clean first visit', () => expect(bootGate(win())).toBe(true));
  it('plays after the root language redirect (same-origin referrer "/")', () => {
    expect(bootGate(win({ referrer: 'https://panspace.me/' }))).toBe(true);
  });
  it('plays when arriving from another site', () => expect(bootGate(win({ referrer: 'https://github.com/' }))).toBe(true));
  it('does not play when already seen', () => expect(bootGate(win({ seen: '1' }))).toBe(false));
  it('does not play under reduced motion', () => expect(bootGate(win({ reduced: true }))).toBe(false));
  it('does not play after client-side navigation', () => expect(bootGate(win({ navigated: true }))).toBe(false));
  it('does not play when arriving from another page of the site', () => {
    expect(bootGate(win({ referrer: 'https://panspace.me/zh/work' }))).toBe(false);
  });
  it('treats unreadable storage as already seen', () => expect(bootGate(win({ throws: true }))).toBe(false));
  it('is self-contained: the generated inline script works without imports', () => {
    const fn = new Function('window', `${bootGateScript().replace('document.documentElement.dataset.boot', 'window.__result')}; return window.__result;`);
    const w = win() as unknown as Record<string, unknown>;
    expect(fn(w)).toBe('play');
  });
});

describe('boot timeline', () => {
  const lines = bootLines('Poter Pan', ['ntutbox', 'spine-ai', 'chippot', 'locmotion']);
  it('builds the whoami / ls / open script', () => {
    expect(lines.map((l) => l.kind)).toEqual(['cmd', 'out', 'cmd', 'out', 'cmd']);
    expect(lines[1]?.text).toBe('poter pan');
    expect(lines[3]?.text).toBe('ntutbox/  spine-ai/  chippot/  …');
  });
  it('fits in 2.5 s including the fold', () => {
    const { steps, foldAt, totalMs } = buildBootTimeline(lines);
    expect(totalMs).toBeLessThanOrEqual(BOOT_MAX_MS);
    expect(foldAt).toBeLessThan(totalMs);
    for (let i = 1; i < steps.length; i++) expect(steps[i]!.at).toBeGreaterThan(steps[i - 1]!.at);
  });
  it('compresses long scripts to stay within budget', () => {
    const long = Array.from({ length: 12 }, () => ({ kind: 'cmd' as const, text: 'a-very-long-command --flag' }));
    expect(buildBootTimeline(long).totalMs).toBeLessThanOrEqual(BOOT_MAX_MS);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/boot.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/boot.ts`**

```ts
export const BOOT_MAX_MS = 2500;
export const FOLD_MS = 400;

export type BootLine = { kind: 'cmd' | 'out'; text: string };
export type BootStep = { lineIndex: number; at: number; duration: number };

type GateWindow = {
  __psNavigated?: boolean;
  matchMedia(query: string): { matches: boolean };
  document: { referrer: string };
  location: { origin: string };
  localStorage: { getItem(key: string): string | null };
};

/**
 * Decides whether the boot sequence plays. MUST stay self-contained (no imports, no outer
 * constants): it is serialized with Function#toString into an inline <head> script.
 * The storage key literal must equal BOOT_KEY in storage.ts; a unit test pins this.
 */
export function bootGate(win: GateWindow): boolean {
  try {
    if (win.__psNavigated) return false;
    if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const ref = win.document.referrer;
    if (ref) {
      const from = new URL(ref);
      if (from.origin === win.location.origin && from.pathname !== '/') return false;
    }
    return win.localStorage.getItem('panspace:boot-seen') === null;
  } catch {
    return false;
  }
}

export function bootGateScript(): string {
  return `if((${bootGate.toString()})(window))document.documentElement.dataset.boot='play';`;
}

export function bootLines(name: string, slugs: string[]): BootLine[] {
  const shown = slugs.slice(0, 3).map((s) => `${s}/`).join('  ');
  return [
    { kind: 'cmd', text: 'whoami' },
    { kind: 'out', text: name.toLowerCase() },
    { kind: 'cmd', text: 'ls ./work' },
    { kind: 'out', text: slugs.length > 3 ? `${shown}  …` : shown },
    { kind: 'cmd', text: 'open panspace' },
  ];
}

export function buildBootTimeline(
  lines: BootLine[],
  opts: { charMs?: number; outMs?: number; gapMs?: number; startMs?: number; maxMs?: number; foldMs?: number } = {},
): { steps: BootStep[]; foldAt: number; totalMs: number } {
  const { charMs = 38, outMs = 60, gapMs = 110, startMs = 150, maxMs = BOOT_MAX_MS, foldMs = FOLD_MS } = opts;
  let t = startMs;
  const raw = lines.map((line, lineIndex) => {
    const duration = line.kind === 'cmd' ? line.text.length * charMs : outMs;
    const step = { lineIndex, at: t, duration };
    t += duration + gapMs;
    return step;
  });
  const budget = maxMs - foldMs;
  const scale = t > budget ? budget / t : 1;
  const steps = raw.map((s) => ({ lineIndex: s.lineIndex, at: Math.round(s.at * scale), duration: Math.round(s.duration * scale) }));
  const foldAt = Math.min(Math.round(t * scale), budget);
  return { steps, foldAt, totalMs: foldAt + foldMs };
}
```

Run: `pnpm test tests/unit/boot.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing e2e test**

`tests/e2e/boot.spec.ts`:

```ts
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
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/boot.spec.ts`
Expected: FAIL. `#boot` isn't found or isn't visible, and `data-boot` is missing.

- [ ] **Step 6: Implement overlay, runtime and CSS**

`src/components/home/BootOverlay.astro`:

```astro
---
import type { BootLine } from '../../lib/boot';

interface Props { lines: BootLine[] }
const { lines } = Astro.props;
---
<div id="boot" class="boot" aria-hidden="true" data-lines={JSON.stringify(lines)}>
  <div class="boot-term">
    <div class="boot-bar"><i></i><i></i><i></i></div>
    {lines.map((line, i) => (
      <div class="boot-line" data-kind={line.kind} data-index={i} style={`--chars:${line.text.length}`}>
        {line.kind === 'cmd' && <span class="boot-prompt">$ </span>}<span class="boot-text">{line.text}</span>
      </div>
    ))}
  </div>
</div>
<script>
  import '../../scripts/boot';
</script>
```

`src/scripts/boot.ts`:

```ts
import { buildBootTimeline, type BootLine } from '../lib/boot';
import { BOOT_KEY, safeSet } from '../lib/storage';

function run(): void {
  const root = document.documentElement;
  const overlay = document.getElementById('boot');
  if (!overlay || root.dataset.boot !== 'play') return;

  const lines = JSON.parse(overlay.dataset.lines ?? '[]') as BootLine[];
  const { steps, foldAt, totalMs } = buildBootTimeline(lines);
  const els = overlay.querySelectorAll<HTMLElement>('.boot-line');
  const timers: number[] = [];

  const finish = () => {
    timers.forEach((id) => window.clearTimeout(id));
    window.removeEventListener('keydown', finish);
    window.removeEventListener('pointerdown', finish);
    safeSet(() => window.localStorage, BOOT_KEY, '1');
    root.dataset.boot = 'done';
  };

  for (const step of steps) {
    const el = els[step.lineIndex];
    if (!el) continue;
    timers.push(
      window.setTimeout(() => {
        el.style.setProperty('--dur', `${step.duration}ms`);
        el.classList.add('is-on');
      }, step.at),
    );
  }
  timers.push(window.setTimeout(() => (root.dataset.boot = 'folding'), foldAt));
  timers.push(window.setTimeout(finish, totalMs));
  window.addEventListener('keydown', finish);
  window.addEventListener('pointerdown', finish);
}

run();
```

Append to `src/styles/global.css`:

```css
/* ---------- boot ---------- */
.boot { display: none; }
html[data-boot="play"], html[data-boot="folding"] { overflow: hidden; }
html[data-boot="play"] .boot,
html[data-boot="folding"] .boot {
  display: grid; place-items: center; position: fixed; inset: 0; z-index: 100; background: var(--color-bg);
}
html[data-boot="folding"] .boot { animation: boot-fold 400ms cubic-bezier(0.7, 0, 0.2, 1) forwards; }
@keyframes boot-fold { to { opacity: 0; transform: scale(1.04); } }
.boot-term { width: min(440px, 90vw); background: #0e1013; border: 1px solid var(--color-line); border-radius: 12px; padding: 14px 16px; font: 13px/1.7 var(--font-mono); }
.boot-bar { display: flex; gap: 6px; margin-bottom: 10px; }
.boot-bar i { width: 10px; height: 10px; border-radius: 50%; background: #2a2e36; }
.boot-line { visibility: hidden; white-space: pre; }
.boot-line.is-on { visibility: visible; }
.boot-line[data-kind="out"] { color: var(--color-muted); }
.boot-prompt { color: var(--color-accent); }
.boot-line[data-kind="cmd"].is-on .boot-text {
  display: inline-block; overflow: hidden; vertical-align: bottom; width: 0;
  animation: boot-type var(--dur, 300ms) steps(var(--chars)) forwards;
}
@keyframes boot-type { to { width: calc(var(--chars) * 1ch); } }
```

Replace `src/pages/[lang]/index.astro` with (adds the head gate and the overlay):

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import BentoGrid from '../../components/home/BentoGrid.astro';
import BootOverlay from '../../components/home/BootOverlay.astro';
import ExperienceSnippet from '../../components/home/ExperienceSnippet.astro';
import ContactSection from '../../components/ContactSection.astro';
import { langPaths, type Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import { getAwards, getExperience, getProfile, getProjects } from '../../lib/content';
import { featuredForHome } from '../../lib/projects';
import { awardYearRange, recentExperience } from '../../lib/experience';
import { bootGateScript, bootLines } from '../../lib/boot';

export const getStaticPaths = langPaths;
const lang = Astro.params.lang as Locale;
const [projects, profile, experience, awards] = await Promise.all([getProjects(), getProfile(), getExperience(), getAwards()]);
const featured = featuredForHome(projects);
---
<BaseLayout lang={lang} path="/" title={`${profile.name[lang]} — ${t(lang, 'home.title')}`} description={profile.tagline[lang]}>
  <Fragment slot="head">
    <script is:inline set:html={bootGateScript()} />
  </Fragment>
  <BootOverlay lines={bootLines(profile.name.en, featured.map((p) => p.slug))} />
  <BentoGrid lang={lang} profile={profile} featured={featured} awardsCount={awards.length} awardYears={awardYearRange(awards)} />
  <ExperienceSnippet lang={lang} items={recentExperience(experience, 5)} />
  <ContactSection lang={lang} profile={profile} />
</BaseLayout>
```

- [ ] **Step 7: Run tests to verify pass**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: everything passes. The other e2e specs are unaffected because the fixture pre-seeds `panspace:boot-seen`.

Then confirm the built inline gate is self-contained:
Run: `grep -c "panspace:boot-seen" dist/zh.html`
Expected: `1` (the literal inside the inlined `bootGate`).

- [ ] **Step 8: Commit**

```bash
git add src/lib/boot.ts src/components/home/BootOverlay.astro src/scripts/boot.ts "src/pages/[lang]/index.astro" src/styles/global.css tests/unit/boot.test.ts tests/e2e/boot.spec.ts
git commit -m "feat: add skippable first-visit boot sequence"
```

---
### Task 7: Project pages, MDX components, confidential rules

**Files:**
- Create: `src/components/mdx/Stat.astro`, `Gallery.astro`, `Compare.astro`, `Diagram.astro`, `src/components/mdx/index.ts`
- Create: `src/components/project/ProjectFacts.astro`, `src/components/project/ProjectNav.astro`, `src/pages/[lang]/work/[slug].astro`
- Create: `tests/unit/helpers/render.ts`, `tests/unit/mdx-components.test.ts`, `tests/unit/project-structure.test.ts`, `tests/e2e/project.spec.ts`
- Modify: `astro.config.mjs` (Shiki theme), `src/styles/global.css` (append "project page" and "prose"), `src/content/projects/ntutbox/zh.mdx`, `src/content/projects/ntutbox/en.mdx`, `tests/e2e/routes.ts`

**Interfaces:**
- Consumes: `getProjects`, `ProjectEntry` (Task 2); `neighbors`, `visibleLinks` (Task 2); `formatPeriod` (Task 2); `t`, `categoryLabel` (Task 3); `BaseLayout` (Task 3); `orderedSlugs`, `projectMetas` (Task 3 e2e helper).
- Produces:
  - Route `/{lang}/work/{slug}`. Markup: `<article class="project">` → `header.project-header` (`.mono-path` = `~/work/{slug}`, `h1.project-title`, `p.project-summary`, `ul.tag-list`, `ul.link-list`) → `div.project-hero > picture` → `details.project-facts-mobile` + `div.project-layout` (`div.project-body.prose-ps`, `aside.project-facts-desktop`) → `nav.project-nav` with `a[rel=prev]` / `a[rel=next]`. Task 8 adds view-transition classes to this markup.
  - `[data-confidential]` notice; GitHub link is never rendered when `confidential`.
  - MDX components available without imports: `<Stat value label note? />`, `<Gallery label images={[{ src, alt }]} caption? />`, `<Compare before={{ src, alt, label }} after={{ src, alt, label }} caption? />`, `<Diagram src? alt? caption?>…</Diagram>`.
  - `tests/e2e/routes.ts` `allPaths()` now includes `/work/<slug>` for every project.
  - `tests/unit/helpers/render.ts`: `renderAstro(component, props?, slots?): Promise<string>`.

- [ ] **Step 1: Write failing unit tests (MDX components and fixed section order)**

`tests/unit/helpers/render.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

type Component = Parameters<AstroContainer['renderToString']>[0];

/** Renders an .astro component to HTML without dev-only source attributes. */
export async function renderAstro(component: Component, props: Record<string, unknown> = {}, slots?: Record<string, string>): Promise<string> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(component, { props, slots });
  return html.replace(/\s?data-astro-source-(?:file|loc)="[^"]*"/g, '');
}
```

`tests/unit/mdx-components.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import Stat from '../../src/components/mdx/Stat.astro';
import Diagram from '../../src/components/mdx/Diagram.astro';
import { renderAstro } from './helpers/render';

describe('MDX components', () => {
  it('Stat renders value, label and optional note', async () => {
    const html = await renderAstro(Stat, { value: '33k', label: 'course rows', note: 'per semester' });
    expect(html).toMatch(/<strong[^>]*>33k<\/strong>/);
    expect(html).toContain('course rows');
    expect(html).toContain('per semester');
  });
  it('Diagram renders slotted content and a caption', async () => {
    const html = await renderAstro(Diagram, { caption: 'Architecture' }, { default: '<svg data-test="d"></svg>' });
    expect(html).toContain('data-test="d"');
    expect(html).toMatch(/<figcaption[^>]*>Architecture<\/figcaption>/);
  });
});
```

`tests/unit/project-structure.test.ts`:

```ts
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SECTIONS = {
  zh: ['背景與問題', '我的角色', '做法與技術決策', '成果', '學到什麼'],
  en: ['Background & problem', 'My role', 'Approach & technical decisions', 'Outcome', 'What I learned'],
} as const;
const root = 'src/content/projects';
const slugs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

describe('project MDX structure', () => {
  for (const slug of slugs) {
    for (const lang of ['zh', 'en'] as const) {
      it(`${slug}/${lang}.mdx exists and uses the fixed sections in order`, () => {
        const file = `${root}/${slug}/${lang}.mdx`;
        expect(existsSync(file)).toBe(true);
        const headings = [...readFileSync(file, 'utf8').matchAll(/^## (.+)$/gm)].map((m) => m[1]?.trim());
        expect(headings).toEqual(SECTIONS[lang]);
      });
    }
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/mdx-components.test.ts tests/unit/project-structure.test.ts`
Expected: `mdx-components` FAILS (components not found). `project-structure` PASSES already for the seed content; it guards the content task.

- [ ] **Step 3: Implement the MDX components**

`src/components/mdx/Stat.astro`:

```astro
---
interface Props { value: string; label: string; note?: string }
const { value, label, note } = Astro.props;
---
<div class="mdx-stat">
  <strong>{value}</strong>
  <span>{label}</span>
  {note && <small>{note}</small>}
</div>
```

`src/components/mdx/Gallery.astro`:

```astro
---
import { Picture } from 'astro:assets';
import type { ImageMetadata } from 'astro';

interface Props { label: string; images: { src: ImageMetadata; alt: string }[]; caption?: string }
const { label, images, caption } = Astro.props;
---
<figure class="mdx-gallery">
  <div class="mdx-gallery-track" role="region" aria-label={label} tabindex="0">
    {images.map((img) => (
      <Picture src={img.src} alt={img.alt} formats={['avif', 'webp']} widths={[360, 720]} sizes="(min-width: 768px) 360px, 80vw" />
    ))}
  </div>
  {caption && <figcaption>{caption}</figcaption>}
</figure>
```

`src/components/mdx/Compare.astro`:

```astro
---
import { Picture } from 'astro:assets';
import type { ImageMetadata } from 'astro';

type Side = { src: ImageMetadata; alt: string; label: string };
interface Props { before: Side; after: Side; caption?: string }
const { before, after, caption } = Astro.props;
---
<figure class="mdx-compare">
  <div class="mdx-compare-grid">
    {[before, after].map((side) => (
      <div>
        <span class="mono-path">{side.label}</span>
        <Picture src={side.src} alt={side.alt} formats={['avif', 'webp']} widths={[480, 800]} sizes="(min-width: 768px) 380px, 100vw" />
      </div>
    ))}
  </div>
  {caption && <figcaption>{caption}</figcaption>}
</figure>
```

`src/components/mdx/Diagram.astro`:

```astro
---
import { Picture } from 'astro:assets';
import type { ImageMetadata } from 'astro';

interface Props { src?: ImageMetadata; alt?: string; caption?: string }
const { src, alt = '', caption } = Astro.props;
---
<figure class="mdx-diagram">
  {src ? <Picture src={src} alt={alt} formats={['avif', 'webp']} widths={[640, 1024]} sizes="(min-width: 1024px) 760px, 100vw" /> : <slot />}
  {caption && <figcaption>{caption}</figcaption>}
</figure>
```

`src/components/mdx/index.ts`:

```ts
import Compare from './Compare.astro';
import Diagram from './Diagram.astro';
import Gallery from './Gallery.astro';
import Stat from './Stat.astro';

export const mdxComponents = { Compare, Diagram, Gallery, Stat };
```

Run: `pnpm test tests/unit/mdx-components.test.ts`
Expected: PASS.

- [ ] **Step 4: Extend the e2e route helper and write the failing project-page test**

Replace the bottom of `tests/e2e/routes.ts` (the `STATIC_PATHS` / `allPaths` part) with:

```ts
/** Language-less paths that exist. Later tasks add '/work' and '/about'. */
export const STATIC_PATHS = ['/'];
export function allPaths(): string[] {
  return [...STATIC_PATHS, ...orderedSlugs().map((s) => `/work/${s}`)];
}
```

`tests/e2e/project.spec.ts`:

```ts
import { expect, test } from './fixtures';
import { orderedSlugs, projectMetas } from './routes';

test.describe('project pages', () => {
  for (const slug of orderedSlugs()) {
    test(`/zh/work/${slug}: header, cover, table of contents`, async ({ page }) => {
      await page.goto(`/zh/work/${slug}`);
      await expect(page.locator('.project-header .mono-path')).toHaveText(`~/work/${slug}`);
      await expect(page.locator('h1.project-title')).toBeVisible();
      await expect(page.locator('.project-hero picture source[type="image/avif"]')).toHaveCount(1);
      await expect(page.locator('.project-hero picture source[type="image/webp"]')).toHaveCount(1);
      const hrefs = await page.locator('.project-facts-desktop nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      expect(hrefs).toHaveLength(5);
      for (const href of hrefs) await expect(page.locator(`[id="${decodeURIComponent(href.slice(1))}"]`)).toHaveCount(1);
    });
  }

  test('desktop: facts sidebar is sticky; mobile: facts collapse under the header', async ({ page }, info) => {
    await page.goto(`/en/work/${orderedSlugs()[0]}`);
    if (info.project.name === 'desktop') {
      await expect(page.locator('.project-facts-desktop')).toBeVisible();
      await expect(page.locator('details.project-facts-mobile')).toBeHidden();
      expect(await page.locator('.project-facts-desktop').evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
    } else {
      await expect(page.locator('.project-facts-desktop')).toBeHidden();
      const details = page.locator('details.project-facts-mobile');
      await expect(details).toBeVisible();
      await details.locator('summary').click();
      await expect(details.locator('dl')).toBeVisible();
    }
  });

  test('confidential projects show the notice and never link to GitHub', async ({ page }) => {
    const confidential = projectMetas().filter((p) => p.meta.confidential);
    expect(confidential.length).toBeGreaterThan(0);
    for (const { slug } of confidential) {
      for (const lang of ['zh', 'en']) {
        await page.goto(`/${lang}/work/${slug}`);
        await expect(page.locator('[data-confidential]').first()).toHaveText(
          lang === 'zh' ? '商業專案・客戶資訊保密' : 'Commercial project · client details confidential',
        );
        await expect(page.locator('article a[href*="github.com"]')).toHaveCount(0);
      }
    }
  });

  test('public projects show their GitHub link', async ({ page }) => {
    await page.goto('/en/work/chippot');
    await expect(page.locator('.link-list a[href="https://github.com/poterpan/ChipPot"]')).toBeVisible();
    await expect(page.locator('[data-confidential]')).toHaveCount(0);
  });

  test('next links walk every project once, in list order', async ({ page }) => {
    const order = orderedSlugs();
    await page.goto(`/zh/work/${order[0]}`);
    await expect(page.locator('a[rel="prev"]')).toHaveCount(0);
    const visited = [order[0]];
    while ((await page.locator('a[rel="next"]').count()) > 0) {
      await page.locator('a[rel="next"]').click();
      await expect(page.locator('h1.project-title')).toBeVisible();
      visited.push(new URL(page.url()).pathname.split('/').pop() ?? '');
    }
    expect(visited).toEqual(order);
  });

  test('MDX components render on the NTUTBox page', async ({ page }) => {
    await page.goto('/zh/work/ntutbox');
    await expect(page.locator('.mdx-stat').first()).toBeVisible();
    await expect(page.locator('.mdx-gallery picture source[type="image/avif"]').first()).toBeAttached();
  });

  test('non-canonical forms redirect, and the language switch still targets the same page', async ({ page, request }) => {
    for (const form of ['/zh/work/ntutbox/', '/zh/work/ntutbox.html']) {
      const res = await request.get(form, { maxRedirects: 0 });
      expect(res.status()).toBe(307);
      expect(res.headers()['location']).toMatch(/\/zh\/work\/ntutbox$/);
    }
    await page.goto('/zh/work/ntutbox/');
    await expect(page).toHaveURL(/\/zh\/work\/ntutbox$/);
    await expect(page.locator('a[data-lang-switch="en"]')).toHaveAttribute('href', '/en/work/ntutbox');
  });

  test.describe('first visit landing on a project page', () => {
    test.use({ bootSeen: false });
    test('navigating home from a project page does not play the boot', async ({ page }) => {
      await page.goto('/zh/work/ntutbox');
      await page.locator('.site-nav .brand').click();
      await expect(page).toHaveURL(/\/zh$/);
      await expect(page.locator('#boot')).toBeHidden();
    });
  });
});
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/project.spec.ts tests/e2e/routes.spec.ts`
Expected: FAIL. `/zh/work/<slug>` returns 404 and `.project-header` is not found.

- [ ] **Step 6: Implement the project page**

Replace `astro.config.mjs`'s `integrations: [react(), mdx()],` line with these two lines (everything else unchanged):

```js
  integrations: [react(), mdx()],
  markdown: { shikiConfig: { theme: 'github-dark-dimmed' } },
```

`src/components/project/ProjectFacts.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import { formatPeriod } from '../../lib/dates';
import type { ProjectEntry } from '../../lib/content';

interface Props { lang: Locale; project: ProjectEntry; toc: { slug: string; text: string }[] }
const { lang, project, toc } = Astro.props;
---
<div class="project-facts">
  {project.meta.confidential && <p class="confidential-note" data-confidential>{t(lang, 'project.confidential')}</p>}
  <dl>
    <dt class="mono-path">{t(lang, 'project.role')}</dt>
    <dd>{project.meta.role[lang]}</dd>
    <dt class="mono-path">{t(lang, 'project.period')}</dt>
    <dd>{formatPeriod(project.meta.date, project.meta.end, lang)}</dd>
    <dt class="mono-path">{t(lang, 'project.stack')}</dt>
    <dd><ul class="stack-list">{project.meta.stack.map((s) => <li>{s}</li>)}</ul></dd>
  </dl>
  {toc.length > 0 && (
    <nav aria-label={t(lang, 'project.toc')}>
      <p class="mono-path">{t(lang, 'project.toc')}</p>
      <ol>{toc.map((h) => <li><a href={`#${h.slug}`}>{h.text}</a></li>)}</ol>
    </nav>
  )}
</div>
```

`src/components/project/ProjectNav.astro`:

```astro
---
import { localizedPath, type Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import type { ProjectEntry } from '../../lib/content';

interface Props { lang: Locale; prev: ProjectEntry | null; next: ProjectEntry | null }
const { lang, prev, next } = Astro.props;
---
<nav class="project-nav" aria-label={`${t(lang, 'project.prev')} / ${t(lang, 'project.next')}`}>
  {prev ? (
    <a rel="prev" href={localizedPath(lang, `/work/${prev.slug}`)}>
      <span class="mono-path">{t(lang, 'project.prev')}</span>
      <span>{prev.text[lang].data.title}</span>
    </a>
  ) : <span></span>}
  {next && (
    <a rel="next" href={localizedPath(lang, `/work/${next.slug}`)} class="next">
      <span class="mono-path">{t(lang, 'project.next')}</span>
      <span>{next.text[lang].data.title}</span>
    </a>
  )}
</nav>
```

`src/pages/[lang]/work/[slug].astro`:

```astro
---
import { Picture } from 'astro:assets';
import { render } from 'astro:content';
import BaseLayout from '../../../layouts/BaseLayout.astro';
import ProjectFacts from '../../../components/project/ProjectFacts.astro';
import ProjectNav from '../../../components/project/ProjectNav.astro';
import { mdxComponents } from '../../../components/mdx';
import { LOCALES, type Locale } from '../../../lib/i18n';
import { categoryLabel, t } from '../../../i18n/ui';
import { getProjects, type ProjectEntry } from '../../../lib/content';
import { neighbors, visibleLinks } from '../../../lib/projects';

export async function getStaticPaths() {
  const projects = await getProjects();
  return projects.flatMap((project) =>
    LOCALES.map((lang) => ({ params: { lang, slug: project.slug }, props: { project, ordered: projects } })),
  );
}

interface Props { project: ProjectEntry; ordered: ProjectEntry[] }
const lang = Astro.params.lang as Locale;
const { project, ordered } = Astro.props;
const body = project.text[lang];
const { Content, headings } = await render(body);
const toc = headings.filter((h) => h.depth === 2);
const { prev, next } = neighbors(ordered, project.slug);
const links = visibleLinks(project.meta);
---
<BaseLayout lang={lang} path={`/work/${project.slug}`} title={`${body.data.title} — ${t(lang, 'meta.siteName')}`} description={body.data.summary}>
  <article class="project">
    <header class="project-header">
      <p class="mono-path">~/work/{project.slug}</p>
      <h1 class="project-title">{body.data.title}</h1>
      <p class="project-summary">{body.data.summary}</p>
      <ul class="tag-list">{project.meta.categories.map((c) => <li>{categoryLabel(lang, c)}</li>)}</ul>
      {links.length > 0 && (
        <ul class="link-list">
          {links.map((l) => <li><a href={l.href} target="_blank" rel="noopener">{t(lang, `project.links.${l.kind}`)} ↗</a></li>)}
        </ul>
      )}
    </header>
    <div class="project-hero">
      <Picture
        src={project.meta.cover}
        alt={project.meta.coverAlt[lang]}
        formats={['avif', 'webp']}
        widths={[640, 1024, 1600]}
        sizes="(min-width: 1120px) 1120px, 100vw"
        loading="eager"
        fetchpriority="high"
      />
    </div>
    <details class="project-facts-mobile">
      <summary>{t(lang, 'project.details')}</summary>
      <ProjectFacts lang={lang} project={project} toc={toc} />
    </details>
    <div class="project-layout">
      <div class="project-body prose-ps">
        <Content components={mdxComponents} />
      </div>
      <aside class="project-facts-desktop" aria-label={t(lang, 'project.details')}>
        <ProjectFacts lang={lang} project={project} toc={toc} />
      </aside>
    </div>
    <ProjectNav lang={lang} prev={prev} next={next} />
  </article>
</BaseLayout>
```

Append to `src/styles/global.css`:

```css
/* ---------- project page ---------- */
.project { padding-top: 32px; }
.project-title { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 750; letter-spacing: -0.02em; line-height: 1.15; margin: 8px 0; }
.project-summary { color: var(--color-muted); font-size: 1.125rem; max-width: 46rem; margin: 0 0 12px; }
.tag-list, .link-list, .stack-list { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; margin: 0 0 12px; padding: 0; }
.tag-list li { font: 12px var(--font-mono); border: 1px solid var(--color-line); border-radius: 999px; padding: 2px 10px; color: var(--color-muted); }
.link-list a { color: var(--color-accent); text-decoration: none; }
.stack-list li { font: 12px var(--font-mono); background: #16191f; border-radius: 6px; padding: 2px 8px; }
.project-hero img { display: block; width: 100%; height: auto; border-radius: var(--radius-card); border: 1px solid var(--color-line); margin-block: 24px; }
.project-layout { display: grid; gap: 40px; }
.project-facts dl { display: grid; gap: 4px 0; margin: 0 0 16px; }
.project-facts dd { margin: 0 0 8px; }
.project-facts ol { margin: 4px 0 0; padding-left: 1.2em; }
.project-facts nav a { color: var(--color-muted); text-decoration: none; }
.project-facts nav a:hover { color: var(--color-text); }
.confidential-note { font: 12px var(--font-mono); color: var(--color-warn); border: 1px solid #fbbf2455; border-radius: 8px; padding: 6px 10px; }
.project-facts-mobile { border: 1px solid var(--color-line); border-radius: 12px; padding: 12px 16px; margin-bottom: 24px; }
@media (min-width: 1024px) {
  .project-layout { grid-template-columns: minmax(0, 1fr) 260px; }
  .project-facts-desktop { position: sticky; top: 88px; align-self: start; }
  .project-facts-mobile { display: none; }
}
@media (max-width: 1023.98px) {
  .project-facts-desktop { display: none; }
}
.project-nav { display: flex; justify-content: space-between; gap: 16px; border-top: 1px solid var(--color-line); margin-top: 48px; padding-top: 24px; }
.project-nav a { display: grid; gap: 2px; text-decoration: none; }
.project-nav .next { text-align: right; }

/* ---------- prose ---------- */
.prose-ps { max-width: 46rem; }
.prose-ps h2 { font-size: 1.375rem; margin: 2.2em 0 0.6em; scroll-margin-top: 80px; }
.prose-ps p, .prose-ps li { color: #c9ced8; }
.prose-ps a { color: var(--color-accent); }
.prose-ps pre { padding: 16px; border-radius: 12px; overflow-x: auto; border: 1px solid var(--color-line); font-size: 0.875rem; }
.prose-ps code { font-family: var(--font-mono); }
.mdx-stat { display: inline-grid; gap: 2px; background: var(--color-card); border: 1px solid var(--color-line); border-radius: 12px; padding: 14px 18px; margin: 8px 8px 8px 0; }
.mdx-stat strong { font-size: 1.75rem; line-height: 1.1; }
.mdx-stat span, .mdx-stat small { color: var(--color-muted); }
.mdx-gallery-track { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; }
.mdx-gallery-track picture { flex: 0 0 auto; scroll-snap-align: start; }
.mdx-gallery-track img { height: 320px; width: auto; border-radius: 12px; border: 1px solid var(--color-line); }
.mdx-compare-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.mdx-compare img, .mdx-diagram img { width: 100%; height: auto; border-radius: 12px; border: 1px solid var(--color-line); }
figcaption { font-size: 0.875rem; color: var(--color-muted); margin-top: 8px; }
```

Update `src/content/projects/ntutbox/zh.mdx`. Add the import directly below the frontmatter, and replace the `## 成果` section with:

```mdx
import cover from './images/cover.png';
```

```mdx
## 成果

<Stat value="App Store" label="已上架" />

<Gallery label="NTUTBox 截圖" images={[{ src: cover, alt: 'NTUTBox 封面' }]} />

App 已上架 App Store，周邊服務持續營運中。
```

Update `src/content/projects/ntutbox/en.mdx` the same way:

```mdx
import cover from './images/cover.png';
```

```mdx
## Outcome

<Stat value="App Store" label="Live" />

<Gallery label="NTUTBox screenshots" images={[{ src: cover, alt: 'NTUTBox cover' }]} />

The app is live on the App Store and the surrounding services are in production.
```

- [ ] **Step 7: Run tests to verify pass**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: everything passes. `routes.spec.ts` and `nav.spec.ts` now also cover `/zh|en/work/<slug>`, including the language switch staying on project pages.

- [ ] **Step 8: Prove a missing translation fails the build**

Run:

```bash
mv src/content/projects/chippot/en.mdx /tmp/chippot-en.mdx
pnpm build; echo "exit=$?"
mv /tmp/chippot-en.mdx src/content/projects/chippot/en.mdx
```

Expected: the build fails with `MissingTranslationError: Project "chippot" is missing en.mdx (both zh.mdx and en.mdx are required).` and prints `exit=1`. After restoring the file, `pnpm build` succeeds again.

- [ ] **Step 9: Commit**

```bash
git add astro.config.mjs src/components/mdx src/components/project "src/pages/[lang]/work/[slug].astro" src/styles/global.css src/content/projects/ntutbox/zh.mdx src/content/projects/ntutbox/en.mdx tests/unit/helpers/render.ts tests/unit/mdx-components.test.ts tests/unit/project-structure.test.ts tests/e2e/routes.ts tests/e2e/project.spec.ts
git commit -m "feat: add project pages with MDX components and confidential rules"
```

---

### Task 8: Card ↔ project page morph (view transitions)

**Files:**
- Create: `src/lib/transitions.ts`, `tests/unit/transitions.test.ts`, `tests/e2e/morph.spec.ts`
- Modify: `src/components/home/ProjectCard.astro`, `src/pages/[lang]/work/[slug].astro`, `src/styles/global.css` (append "view transitions", unlayered)

**Interfaces:**
- Consumes: `ProjectCard.astro` (Task 4), project page markup (Task 7), `<ClientRouter />` in `BaseLayout` (Task 3).
- Produces: `src/lib/transitions.ts`: `vtNames(slug): { card: string; title: string; cover: string }` (`card-<slug>`, `title-<slug>`, `cover-<slug>`, with any character outside `[a-z0-9-]` replaced by `-`), and `vtStyle(slug): string` (`--vt-card:…;--vt-title:…;--vt-cover:…`). CSS classes `.vt-card`, `.vt-title`, `.vt-cover` turn those custom properties into `view-transition-name`. Task 9 reuses both for `/work` cards.

- [ ] **Step 1: Write the failing unit test**

`tests/unit/transitions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { vtNames, vtStyle } from '../../src/lib/transitions';

describe('view-transition names', () => {
  it('derives three stable names per project', () => {
    expect(vtNames('spine-ai')).toEqual({ card: 'card-spine-ai', title: 'title-spine-ai', cover: 'cover-spine-ai' });
  });
  it('sanitizes characters that are not valid in a CSS ident', () => {
    expect(vtNames('Foo.Bar_1').card).toBe('card-foo-bar-1');
  });
  it('emits custom properties', () => {
    expect(vtStyle('chippot')).toBe('--vt-card:card-chippot;--vt-title:title-chippot;--vt-cover:cover-chippot');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/transitions.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/transitions.ts`**

```ts
const ident = (slug: string) => slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

export function vtNames(slug: string): { card: string; title: string; cover: string } {
  const id = ident(slug);
  return { card: `card-${id}`, title: `title-${id}`, cover: `cover-${id}` };
}

export function vtStyle(slug: string): string {
  const n = vtNames(slug);
  return `--vt-card:${n.card};--vt-title:${n.title};--vt-cover:${n.cover}`;
}
```

Run: `pnpm test tests/unit/transitions.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing e2e test**

`tests/e2e/morph.spec.ts`:

```ts
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { orderedSlugs } from './routes';

const vtName = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((e) => getComputedStyle(e).getPropertyValue('view-transition-name'));

const allNames = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .map((e) => getComputedStyle(e).getPropertyValue('view-transition-name'))
      .filter((n) => n && n !== 'none'),
  );

const countTransitions = () => {
  const proto = Document.prototype as unknown as { startViewTransition?: (...a: unknown[]) => unknown };
  const original = proto.startViewTransition;
  (window as unknown as { __vt: number }).__vt = 0;
  if (!original) return;
  proto.startViewTransition = function (this: unknown, ...args: unknown[]) {
    (window as unknown as { __vt: number }).__vt++;
    return original.apply(this, args);
  };
};

test('card, title and cover share names with the project page', async ({ page }) => {
  await page.goto('/zh');
  const card = '.project-card[data-slot="p1"]';
  const slug = (await page.locator(card).getAttribute('href'))!.split('/').pop()!;
  expect(await vtName(page, card)).toBe(`card-${slug}`);
  expect(await vtName(page, `${card} .card-title`)).toBe(`title-${slug}`);
  expect(await vtName(page, `${card} img`)).toBe(`cover-${slug}`);
  await page.goto(`/zh/work/${slug}`);
  expect(await vtName(page, '.project-header')).toBe(`card-${slug}`);
  expect(await vtName(page, 'h1.project-title')).toBe(`title-${slug}`);
  expect(await vtName(page, '.project-hero img')).toBe(`cover-${slug}`);
});

test('clicking a card morphs client-side, and back reverses it', async ({ page }) => {
  await page.addInitScript(countTransitions);
  await page.goto('/zh');
  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 1));
  await page.locator('.project-card[data-slot="p1"]').click();
  await expect(page).toHaveURL(/\/zh\/work\/[\w-]+$/);
  await expect(page.locator('h1.project-title')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBeGreaterThanOrEqual(1);
  await page.goBack();
  await expect(page).toHaveURL(/\/zh$/);
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBeGreaterThanOrEqual(2);
});

test('reduced motion: no shared-element names (cross-fade only), navigation still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/zh');
  expect(await vtName(page, '.project-card[data-slot="p1"]')).toBe('none');
  await page.locator('.project-card[data-slot="p1"]').click();
  await expect(page.locator('h1.project-title')).toBeVisible();
  expect(await vtName(page, 'h1.project-title')).toBe('none');
});

test('browsers without View Transitions still navigate', async ({ page }) => {
  await page.addInitScript(() => {
    delete (Document.prototype as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
  await page.goto('/zh');
  await page.locator('.project-card[data-slot="p1"]').click();
  await expect(page.locator('h1.project-title')).toBeVisible();
});

test('names are unique on every page', async ({ page }) => {
  for (const url of ['/zh', '/en', ...orderedSlugs().map((s) => `/zh/work/${s}`)]) {
    await page.goto(url);
    const names = await allNames(page);
    expect(new Set(names).size, `${url}: ${names.join(', ')}`).toBe(names.length);
  }
});
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/morph.spec.ts`
Expected: FAIL. The first test gets `none` instead of `card-<slug>`.

- [ ] **Step 6: Implement names, classes and CSS**

In `src/components/home/ProjectCard.astro`:
- add `import { vtStyle } from '../../lib/transitions';` to the frontmatter;
- change the `<a>`'s `class` to `"bento-card project-card vt-card"` and its `style` to ``{`grid-area:${slot};${vtStyle(project.slug)}`}``;
- change the `h2`'s class to `"card-title vt-title"`;
- change the `Picture`'s `class` to `"card-cover vt-cover"`.

In `src/pages/[lang]/work/[slug].astro`:
- add `import { vtStyle } from '../../../lib/transitions';` to the frontmatter;
- change `<article class="project">` to `<article class="project" style={vtStyle(project.slug)}>`;
- change `<header class="project-header">` to `<header class="project-header vt-card">`;
- change `<h1 class="project-title">` to `<h1 class="project-title vt-title">`;
- add `class="vt-cover"` to the hero `<Picture … />`.

Append to `src/styles/global.css`. This must stay **outside** any `@layer`, so it can override Astro's unlayered `!important` reduced-motion rule:

```css
/* ---------- view transitions (keep unlayered) ---------- */
.vt-card { view-transition-name: var(--vt-card, none); }
.vt-title { view-transition-name: var(--vt-title, none); }
.vt-cover { view-transition-name: var(--vt-cover, none); }
::view-transition-group(*) { animation-duration: 420ms; animation-timing-function: cubic-bezier(0.2, 0.9, 0.2, 1); }
@media (prefers-reduced-motion: reduce) {
  .vt-card, .vt-title, .vt-cover { view-transition-name: none; }
  html::view-transition-old(root) { animation: 160ms ease both ps-fade-out !important; }
  html::view-transition-new(root) { animation: 160ms ease both ps-fade-in !important; }
}
@keyframes ps-fade-out { to { opacity: 0; } }
@keyframes ps-fade-in { from { opacity: 0; } }
```

- [ ] **Step 7: Run tests to verify pass**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: all pass.

Then do a manual check in Chrome: run `pnpm preview:cf`, open `http://127.0.0.1:8788/zh`, click the first card, and watch the card grow into the page header while the title and cover fly to their places. Press Back and it reverses. Enable "Emulate CSS prefers-reduced-motion: reduce" in DevTools > Rendering and confirm it only cross-fades.

- [ ] **Step 8: Commit**

```bash
git add src/lib/transitions.ts src/components/home/ProjectCard.astro "src/pages/[lang]/work/[slug].astro" src/styles/global.css tests/unit/transitions.test.ts tests/e2e/morph.spec.ts
git commit -m "feat: morph cards into project pages with view transitions"
```

---
### Task 9: `/work` list with category filters and Motion layout animation

**Files:**
- Create: `src/lib/work.ts`, `src/components/work/WorkGrid.tsx`, `src/pages/[lang]/work/index.astro`, `tests/unit/work.test.ts`, `tests/e2e/work.spec.ts`
- Modify: `src/styles/global.css` (append "page header" and "work list"), `tests/e2e/routes.ts`, `tests/e2e/morph.spec.ts`

**Interfaces:**
- Consumes: `CATEGORIES`, `Category` (Task 2 `taxonomy.ts`); `filterByCategory` (Task 2); `getProjects` (Task 2); `formatPeriod` (Task 2); `vtNames` (Task 8); `t`, `categoryLabel` (Task 3); `[data-spotlight]` delegation (Task 5).
- Produces:
  - `src/lib/work.ts`: `type WorkFilterKey = Category | 'all'`, `interface WorkFilter { key: WorkFilterKey; label: string }`, `interface WorkCardData { slug; href; title; summary; categories: Category[]; categoryLabels: string[]; period: string; cover: { avifSrcset: string; webpSrcset: string; src: string; width: number; height: number; alt: string } }`, `parseCategoryParam(value: string | null): WorkFilterKey`
  - Route `/{lang}/work`. Markup: `.work-filters` (`button.filter-chip[aria-pressed]`, hidden until hydrated), `p[role=status]` count, `ul.work-grid > li > a.work-card.vt-card[data-spotlight]`. URL state lives in `?cat=<category>`.
  - CSS classes `.page-title`, `.page-lede`, `.filter-chip` (Task 10 reuses them).

- [ ] **Step 1: Write the failing unit test**

`tests/unit/work.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseCategoryParam } from '../../src/lib/work';

describe('parseCategoryParam', () => {
  it('accepts known categories', () => {
    expect(parseCategoryParam('ios')).toBe('ios');
    expect(parseCategoryParam('competition')).toBe('competition');
  });
  it('falls back to all for missing or unknown values', () => {
    expect(parseCategoryParam(null)).toBe('all');
    expect(parseCategoryParam('')).toBe('all');
    expect(parseCategoryParam('android')).toBe('all');
    expect(parseCategoryParam('IOS')).toBe('all');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/work.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/work.ts`**

```ts
import { CATEGORIES, type Category } from './taxonomy';

export type WorkFilterKey = Category | 'all';

export interface WorkFilter {
  key: WorkFilterKey;
  label: string;
}

export interface WorkCardData {
  slug: string;
  href: string;
  title: string;
  summary: string;
  categories: Category[];
  categoryLabels: string[];
  period: string;
  cover: { avifSrcset: string; webpSrcset: string; src: string; width: number; height: number; alt: string };
}

export function parseCategoryParam(value: string | null): WorkFilterKey {
  return value && (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : 'all';
}
```

Run: `pnpm test tests/unit/work.test.ts`
Expected: PASS.

- [ ] **Step 4: Extend routes and write the failing e2e test**

In `tests/e2e/routes.ts` change `export const STATIC_PATHS = ['/'];` to:

```ts
export const STATIC_PATHS = ['/', '/work'];
```

`tests/e2e/work.spec.ts`:

```ts
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { orderedSlugs, projectMetas } from './routes';

const hrefs = (page: Page) =>
  page.locator('.work-grid a.work-card').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
const hydrated = (page: Page) =>
  expect(page.locator('astro-island[component-url*="WorkGrid"]:not([ssr])')).toBeAttached();
const slugsWith = (category: string) =>
  orderedSlugs().filter((s) => projectMetas().find((p) => p.slug === s)?.meta.categories.includes(category));

test('lists every project in list order', async ({ page }) => {
  await page.goto('/en/work');
  expect(await hrefs(page)).toEqual(orderedSlugs().map((s) => `/en/work/${s}`));
});

test('filtering by category re-lays out the grid and updates the URL', async ({ page }) => {
  await page.goto('/zh/work');
  await hydrated(page);
  const ios = page.getByRole('button', { name: 'iOS', exact: true });
  await ios.click();
  await expect(ios).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/\?cat=ios$/);
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(slugsWith('ios').length);
  expect(await hrefs(page)).toEqual(slugsWith('ios').map((s) => `/zh/work/${s}`));
  await expect(page.locator('.work-status')).toHaveText(`共 ${slugsWith('ios').length} 個作品`);
  await page.getByRole('button', { name: '全部' }).click();
  await expect(page).toHaveURL(/\/zh\/work$/);
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(orderedSlugs().length);
});

test('a ?cat= link preselects the filter', async ({ page }) => {
  await page.goto('/en/work?cat=web');
  await hydrated(page);
  await expect(page.getByRole('button', { name: 'Web', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(slugsWith('web').length);
});

test('unknown category falls back to all', async ({ page }) => {
  await page.goto('/en/work?cat=android');
  await hydrated(page);
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(orderedSlugs().length);
});

test('reduced motion: filtering switches instantly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/work');
  await hydrated(page);
  await page.getByRole('button', { name: 'iOS', exact: true }).click();
  await expect(page.locator('.work-grid a.work-card')).toHaveCount(slugsWith('ios').length, { timeout: 150 });
});

test('cards morph into the project page and names stay unique', async ({ page }) => {
  await page.goto('/zh/work');
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .map((e) => getComputedStyle(e).getPropertyValue('view-transition-name'))
      .filter((n) => n && n !== 'none'),
  );
  expect(new Set(names).size).toBe(names.length);
  const first = orderedSlugs()[0];
  const card = page.locator(`a.work-card[href="/zh/work/${first}"]`);
  expect(await card.evaluate((e) => getComputedStyle(e).getPropertyValue('view-transition-name'))).toBe(`card-${first}`);
  await card.click();
  await expect(page.locator('h1.project-title')).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all projects are listed and the inert filters are hidden', async ({ page }) => {
    await page.goto('/zh/work');
    await expect(page.locator('.work-grid a.work-card')).toHaveCount(orderedSlugs().length);
    await expect(page.locator('.work-filters')).toBeHidden();
  });
});
```

In `tests/e2e/morph.spec.ts`, change the URL list in "names are unique on every page" to:

```ts
  for (const url of ['/zh', '/en', '/zh/work', '/en/work', ...orderedSlugs().map((s) => `/zh/work/${s}`)]) {
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/work.spec.ts`
Expected: FAIL, `/en/work` returns 404 and no `.work-card` is found.

- [ ] **Step 6: Implement the island, page and CSS**

`src/components/work/WorkGrid.tsx`:

```tsx
import { useEffect, useState, type CSSProperties } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { filterByCategory } from '../../lib/projects';
import { vtNames } from '../../lib/transitions';
import { parseCategoryParam, type WorkCardData, type WorkFilter, type WorkFilterKey } from '../../lib/work';

interface Props {
  items: WorkCardData[];
  filters: WorkFilter[];
  filterLabel: string;
  countTemplate: string;
}

export default function WorkGrid({ items, filters, filterLabel, countTemplate }: Props) {
  const [active, setActive] = useState<WorkFilterKey>('all');
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    setActive(parseCategoryParam(new URLSearchParams(window.location.search).get('cat')));
    setReady(true);
  }, []);

  function choose(key: WorkFilterKey): void {
    setActive(key);
    const url = new URL(window.location.href);
    if (key === 'all') url.searchParams.delete('cat');
    else url.searchParams.set('cat', key);
    window.history.replaceState(window.history.state, '', url);
  }

  const visible = filterByCategory(items, active);
  const transition = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 32 };

  return (
    <MotionConfig reducedMotion="user" transition={transition}>
      <div className="work-filters" role="group" aria-label={filterLabel} hidden={!ready}>
        {filters.map((f) => (
          <button key={f.key} type="button" className="filter-chip" aria-pressed={active === f.key} onClick={() => choose(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="mono-path work-status" role="status" aria-live="polite">
        {countTemplate.replace('{n}', String(visible.length))}
      </p>
      <motion.ul layout className="work-grid" style={{ position: 'relative' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((item) => {
            const names = vtNames(item.slug);
            const vars = { '--vt-card': names.card, '--vt-title': names.title, '--vt-cover': names.cover } as CSSProperties;
            return (
              <motion.li
                key={item.slug}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <a href={item.href} className="bento-card work-card vt-card" data-spotlight style={vars}>
                  <picture>
                    <source type="image/avif" srcSet={item.cover.avifSrcset} sizes="(min-width: 1024px) 360px, 100vw" />
                    <source type="image/webp" srcSet={item.cover.webpSrcset} sizes="(min-width: 1024px) 360px, 100vw" />
                    <img
                      className="card-cover vt-cover"
                      src={item.cover.src}
                      alt={item.cover.alt}
                      width={item.cover.width}
                      height={item.cover.height}
                      loading="lazy"
                      decoding="async"
                    />
                  </picture>
                  <span className="mono-path">{item.categoryLabels.join(' · ')} · {item.period}</span>
                  <h2 className="card-title vt-title">{item.title}</h2>
                  <p className="card-summary">{item.summary}</p>
                </a>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
    </MotionConfig>
  );
}
```

`src/pages/[lang]/work/index.astro`:

```astro
---
import { getImage } from 'astro:assets';
import BaseLayout from '../../../layouts/BaseLayout.astro';
import WorkGrid from '../../../components/work/WorkGrid.tsx';
import { langPaths, localizedPath, type Locale } from '../../../lib/i18n';
import { categoryLabel, t } from '../../../i18n/ui';
import { CATEGORIES } from '../../../lib/taxonomy';
import { formatPeriod } from '../../../lib/dates';
import { getProjects } from '../../../lib/content';
import type { WorkCardData, WorkFilter } from '../../../lib/work';

export const getStaticPaths = langPaths;
const lang = Astro.params.lang as Locale;
const projects = await getProjects();

const items: WorkCardData[] = await Promise.all(
  projects.map(async (p) => {
    const [avif, webp] = await Promise.all([
      getImage({ src: p.meta.cover, widths: [400, 800], format: 'avif' }),
      getImage({ src: p.meta.cover, widths: [400, 800], format: 'webp' }),
    ]);
    return {
      slug: p.slug,
      href: localizedPath(lang, `/work/${p.slug}`),
      title: p.text[lang].data.title,
      summary: p.text[lang].data.summary,
      categories: p.meta.categories,
      categoryLabels: p.meta.categories.map((c) => categoryLabel(lang, c)),
      period: formatPeriod(p.meta.date, p.meta.end, lang),
      cover: {
        avifSrcset: avif.srcSet.attribute,
        webpSrcset: webp.srcSet.attribute,
        src: webp.src,
        width: p.meta.cover.width,
        height: p.meta.cover.height,
        alt: p.meta.coverAlt[lang],
      },
    };
  }),
);
const filters: WorkFilter[] = [
  { key: 'all', label: t(lang, 'work.filter.all') },
  ...CATEGORIES.map((c) => ({ key: c, label: categoryLabel(lang, c) })),
];
---
<BaseLayout lang={lang} path="/work" title={`${t(lang, 'work.title')} — ${t(lang, 'meta.siteName')}`} description={t(lang, 'work.description')}>
  <section class="section">
    <p class="mono-path">~/work</p>
    <h1 class="page-title">{t(lang, 'work.title')}</h1>
    <p class="page-lede">{t(lang, 'work.description')}</p>
    <WorkGrid client:load items={items} filters={filters} filterLabel={t(lang, 'work.filterLabel')} countTemplate={t(lang, 'work.count')} />
  </section>
</BaseLayout>
```

Append to `src/styles/global.css`:

```css
/* ---------- page header ---------- */
.page-title { font-size: clamp(1.75rem, 4vw, 2.5rem); font-weight: 750; letter-spacing: -0.02em; margin: 4px 0 8px; }
.page-lede { color: var(--color-muted); margin: 0 0 24px; max-width: 46rem; }
.filter-chip { font: 13px var(--font-mono); color: var(--color-muted); background: var(--color-card); border: 1px solid var(--color-line); border-radius: 999px; padding: 6px 14px; cursor: pointer; }
.filter-chip:hover { color: var(--color-text); }
.filter-chip[aria-pressed="true"] { color: var(--color-bg); background: var(--color-accent); border-color: var(--color-accent); }

/* ---------- work list ---------- */
.work-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.work-grid { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
.work-grid > li { min-width: 0; }
.work-card { height: 100%; }
.work-card .card-cover { margin: 0 0 8px; }
```

- [ ] **Step 7: Run tests to verify pass**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: all pass. `routes.spec.ts` and `nav.spec.ts` now include `/zh/work` and `/en/work`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/work.ts src/components/work/WorkGrid.tsx "src/pages/[lang]/work/index.astro" src/styles/global.css tests/unit/work.test.ts tests/e2e/work.spec.ts tests/e2e/routes.ts tests/e2e/morph.spec.ts
git commit -m "feat: add filterable work list with layout animation"
```

---

### Task 10: `/about` — intro, filterable timeline, awards, skills, contact

**Files:**
- Create: `src/components/about/Timeline.astro`, `src/components/about/AwardsList.astro`, `src/components/about/SkillsList.astro`, `src/scripts/timeline-filter.ts`, `src/pages/[lang]/about.astro`, `tests/e2e/about.spec.ts`
- Modify: `src/styles/global.css` (append "about"), `tests/e2e/routes.ts`

**Interfaces:**
- Consumes: `getProfile`, `getExperience`, `getAwards`, `Experience`, `Award`, `Profile` (Task 2); `EXPERIENCE_TYPES` (Task 2 `taxonomy.ts`); `formatPeriod` (Task 2); `t`, `experienceTypeLabel` (Task 3); `ContactSection` (Task 4); `.page-title`, `.filter-chip` (Task 9).
- Produces: route `/{lang}/about` with sections `#timeline` (`.timeline-filters` hidden until JS, `button[data-timeline-filter]`, `li.timeline-item[data-type]`, `.timeline-progress`), `#awards`, `#skills`, `#contact`. Task 12 adds Person JSON-LD to this page.

- [ ] **Step 1: Extend routes and write the failing e2e test**

In `tests/e2e/routes.ts` change `STATIC_PATHS` to:

```ts
export const STATIC_PATHS = ['/', '/work', '/about'];
```

`tests/e2e/about.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/about.spec.ts`
Expected: FAIL, `/zh/about` returns 404.

- [ ] **Step 3: Implement components, script, page and CSS**

`src/components/about/Timeline.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { experienceTypeLabel, t } from '../../i18n/ui';
import { EXPERIENCE_TYPES } from '../../lib/taxonomy';
import { formatPeriod } from '../../lib/dates';
import type { Experience } from '../../lib/content';

interface Props { lang: Locale; items: Experience[] }
const { lang, items } = Astro.props;
const types = EXPERIENCE_TYPES.filter((type) => items.some((i) => i.type === type));
---
<section id="timeline" class="section" aria-labelledby="timeline-title">
  <h2 id="timeline-title" class="section-title">{t(lang, 'about.timeline')}</h2>
  <div class="timeline-filters" role="group" aria-label={t(lang, 'about.filterLabel')} hidden>
    <button type="button" class="filter-chip" data-timeline-filter="all" aria-pressed="true">{t(lang, 'about.filter.all')}</button>
    {types.map((type) => (
      <button type="button" class="filter-chip" data-timeline-filter={type} aria-pressed="false">{experienceTypeLabel(lang, type)}</button>
    ))}
  </div>
  <div class="timeline-wrap">
    <span class="timeline-progress" aria-hidden="true"></span>
    <ol class="timeline">
      {items.map((item) => (
        <li class="timeline-item" data-type={item.type}>
          <span class="mono-path">{formatPeriod(item.start, item.end, lang)} · {experienceTypeLabel(lang, item.type)}</span>
          <h3>{item.title[lang]}</h3>
          <p class="timeline-org">{item.org[lang]}</p>
          <p>{item.description[lang]}</p>
        </li>
      ))}
    </ol>
  </div>
</section>
<script>
  import '../../scripts/timeline-filter';
</script>
```

`src/scripts/timeline-filter.ts`:

```ts
function bind(): void {
  document.querySelectorAll<HTMLElement>('.timeline-filters').forEach((group) => {
    group.hidden = false;
    if (group.dataset.bound) return;
    group.dataset.bound = '1';
    const section = group.closest('section');
    group.addEventListener('click', (event) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('button[data-timeline-filter]');
      if (!button || !section) return;
      const type = button.dataset.timelineFilter;
      group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      section.querySelectorAll<HTMLElement>('.timeline-item').forEach((item) => {
        item.hidden = type !== 'all' && item.dataset.type !== type;
      });
    });
  });
}

document.addEventListener('astro:page-load', bind);
```

`src/components/about/AwardsList.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import type { Award } from '../../lib/content';

interface Props { lang: Locale; items: Award[] }
const { lang, items } = Astro.props;
---
<section id="awards" class="section" aria-labelledby="awards-title">
  <h2 id="awards-title" class="section-title">{t(lang, 'about.awards')}</h2>
  <ol class="awards-list">
    {items.map((a) => (
      <li>
        <span class="mono-path">{a.year} · {t(lang, a.kind === 'paper' ? 'award.paper' : 'award.award')}</span>
        <strong>{a.name[lang]}</strong>
        {a.rank && <span class="award-rank">{a.rank[lang]}</span>}
        {a.org && <span class="mono-path">{a.org[lang]}</span>}
      </li>
    ))}
  </ol>
</section>
```

`src/components/about/SkillsList.astro`:

```astro
---
import type { Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import type { Profile } from '../../lib/content';

interface Props { lang: Locale; skills: Profile['skills'] }
const { lang, skills } = Astro.props;
---
<section id="skills" class="section" aria-labelledby="skills-title">
  <h2 id="skills-title" class="section-title">{t(lang, 'about.skills')}</h2>
  <div class="skills-grid">
    {skills.map((group) => (
      <div>
        <h3 class="mono-path">{group.group[lang]}</h3>
        <ul class="stack-list">{group.items.map((item) => <li>{item}</li>)}</ul>
      </div>
    ))}
  </div>
</section>
```

`src/pages/[lang]/about.astro`:

```astro
---
import { Picture } from 'astro:assets';
import BaseLayout from '../../layouts/BaseLayout.astro';
import Timeline from '../../components/about/Timeline.astro';
import AwardsList from '../../components/about/AwardsList.astro';
import SkillsList from '../../components/about/SkillsList.astro';
import ContactSection from '../../components/ContactSection.astro';
import { langPaths, type Locale } from '../../lib/i18n';
import { t } from '../../i18n/ui';
import { getAwards, getExperience, getProfile } from '../../lib/content';

export const getStaticPaths = langPaths;
const lang = Astro.params.lang as Locale;
const [profile, experience, awards] = await Promise.all([getProfile(), getExperience(), getAwards()]);
---
<BaseLayout lang={lang} path="/about" title={`${t(lang, 'about.title')} — ${profile.name[lang]}`} description={profile.bio[lang]}>
  <section class="section">
    <p class="mono-path">~/about</p>
    <h1 class="page-title">{t(lang, 'about.title')}</h1>
    <div class="about-intro">
      <p class="about-bio">{profile.bio[lang]}</p>
      {profile.photo && (
        <Picture src={profile.photo} alt={profile.name[lang]} formats={['avif', 'webp']} widths={[240, 480]} sizes="240px" class="about-photo" loading="eager" />
      )}
    </div>
  </section>
  <Timeline lang={lang} items={experience} />
  <AwardsList lang={lang} items={awards} />
  <SkillsList lang={lang} skills={profile.skills} />
  <ContactSection lang={lang} profile={profile} />
</BaseLayout>
```

Append to `src/styles/global.css`:

```css
/* ---------- about ---------- */
.about-intro { display: grid; gap: 24px; align-items: start; }
@media (min-width: 768px) { .about-intro { grid-template-columns: minmax(0, 1fr) 240px; } }
.about-bio { font-size: 1.125rem; max-width: 46rem; margin: 0; }
.about-photo { width: 240px; height: auto; border-radius: var(--radius-card); border: 1px solid var(--color-line); }
.timeline-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.timeline-wrap { position: relative; padding-left: 28px; }
.timeline-wrap::before { content: ""; position: absolute; left: 7px; top: 6px; bottom: 6px; width: 2px; background: var(--color-line); }
.timeline-progress { position: absolute; left: 7px; top: 6px; bottom: 6px; width: 2px; background: var(--color-accent); transform-origin: top; }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .timeline-progress { animation: timeline-draw linear both; animation-timeline: view(); animation-range: entry 10% exit 90%; }
  }
}
@keyframes timeline-draw { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 24px; }
.timeline-item { position: relative; }
.timeline-item::before { content: ""; position: absolute; left: -26px; top: 7px; width: 10px; height: 10px; border-radius: 50%; background: var(--color-bg); border: 2px solid var(--color-accent); }
.timeline-item h3 { font-size: 1.05rem; margin: 2px 0; }
.timeline-item p { margin: 0; }
.timeline-org { color: var(--color-muted); }
.awards-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.awards-list li { display: grid; gap: 2px; }
.award-rank { color: var(--color-accent); }
.skills-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.skills-grid h3 { margin: 0 0 8px; }
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: all pass. `routes.spec.ts` and `nav.spec.ts` now include `/zh/about` and `/en/about`.

- [ ] **Step 5: Commit**

```bash
git add src/components/about src/scripts/timeline-filter.ts "src/pages/[lang]/about.astro" src/styles/global.css tests/e2e/about.spec.ts tests/e2e/routes.ts
git commit -m "feat: add about page with filterable timeline, awards and skills"
```

---
### Task 11: ⌘K command palette

**Files:**
- Create: `src/lib/fuzzy.ts`, `src/lib/palette.ts`, `src/components/palette/CommandPalette.tsx`, `tests/unit/fuzzy.test.ts`, `tests/unit/palette.test.ts`, `tests/e2e/palette.spec.ts`
- Modify: `src/layouts/BaseLayout.astro`, `src/styles/global.css` (append "palette")

**Interfaces:**
- Consumes: `localizedPath`, `otherLocale`, `switchLangPath`, `Locale` (Task 1); `LANG_KEY`, `safeSet` (Task 1); `getProjects`, `getProfile` (Task 2); `resumeHref` (Task 4); `t` (Task 3); `button[data-palette-open]` in `Nav.astro` (Task 3); `allPaths()` (e2e helper).
- Produces:
  - `src/lib/fuzzy.ts`: `fuzzyScore(query: string, text: string): number | null`, `fuzzyFilter<T>(items: readonly T[], query: string, text: (item: T) => string): T[]`
  - `src/lib/palette.ts`: `type PaletteAction`, `interface PaletteItem { id; label; hint; group: 'page'|'project'|'action'; keywords; action }`, `interface PaletteItemLabels`, `buildPaletteItems(input: PaletteInput): PaletteItem[]`
  - `CommandPalette.tsx` props `{ items: PaletteItem[]; labels: { title; placeholder; listLabel; empty; open; copied } }`. It renders `button.palette-fab` (hidden until mounted) and `dialog.palette` containing `input[role=combobox]` and `ul[role=listbox] > li[role=option]`.
  - Mounted on every page whose layout `path !== null`, as `client:idle` with `transition:persist="palette-<lang>"`.

- [ ] **Step 1: Write failing unit tests**

`tests/unit/fuzzy.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fuzzyFilter, fuzzyScore } from '../../src/lib/fuzzy';

describe('fuzzyScore', () => {
  it('matches subsequences case-insensitively, including CJK', () => {
    expect(fuzzyScore('ntb', 'NTUTBox 北科盒子')).not.toBeNull();
    expect(fuzzyScore('北科', 'NTUTBox 北科盒子')).not.toBeNull();
    expect(fuzzyScore('CHIP', 'ChipPot')).not.toBeNull();
  });
  it('returns null when a character is missing and 0 for an empty query', () => {
    expect(fuzzyScore('xyz', 'ChipPot')).toBeNull();
    expect(fuzzyScore('  ', 'anything')).toBe(0);
  });
  it('prefers contiguous, prefix and word-start matches', () => {
    expect(fuzzyScore('spine', 'Spine X-ray AI')!).toBeGreaterThan(fuzzyScore('spine', 'some pointless innate example')!);
    expect(fuzzyScore('work', 'All work')!).toBeLessThan(fuzzyScore('work', 'work list')!);
  });
});

describe('fuzzyFilter', () => {
  const items = ['About', 'ChipPot', 'NTUTBox', 'Chinese'];
  it('keeps order for an empty query', () => expect(fuzzyFilter(items, '', (s) => s)).toEqual(items));
  it('filters and ranks', () => {
    expect(fuzzyFilter(items, 'chip', (s) => s)).toEqual(['ChipPot']);
    expect(fuzzyFilter(items, 'ch', (s) => s)).toEqual(['ChipPot', 'Chinese']);
  });
});
```

`tests/unit/palette.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildPaletteItems, type PaletteItemLabels } from '../../src/lib/palette';

const labels: PaletteItemLabels = {
  home: '首頁', work: '作品列表', about: '關於我', switchLang: '切換到 English', copyEmail: '複製 email',
  resume: '下載履歷', github: '開啟 GitHub', linkedin: '開啟 LinkedIn', action: '動作',
};
const base = {
  lang: 'zh' as const,
  labels,
  projects: [{ slug: 'ntutbox', title: 'NTUTBox 北科盒子', altTitle: 'NTUTBox' }],
  email: 'poter.pan@panspace.me',
  github: 'https://github.com/poterpan',
  resumeHref: null,
};

describe('buildPaletteItems', () => {
  it('lists pages, projects and actions with localized targets', () => {
    const items = buildPaletteItems(base);
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId['page:home']?.action).toEqual({ type: 'navigate', href: '/zh' });
    expect(byId['page:work']?.action).toEqual({ type: 'navigate', href: '/zh/work' });
    expect(byId['page:about']?.action).toEqual({ type: 'navigate', href: '/zh/about' });
    expect(byId['project:ntutbox']?.action).toEqual({ type: 'navigate', href: '/zh/work/ntutbox' });
    expect(byId['project:ntutbox']?.keywords).toContain('NTUTBox');
    expect(byId['action:lang']?.action).toEqual({ type: 'switch-lang', target: 'en' });
    expect(byId['action:email']?.action).toEqual({ type: 'copy', text: 'poter.pan@panspace.me' });
    expect(byId['action:github']?.action).toEqual({ type: 'external', href: 'https://github.com/poterpan' });
    expect(byId['action:resume']).toBeUndefined();
    expect(byId['action:linkedin']).toBeUndefined();
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it('adds résumé and LinkedIn when available', () => {
    const items = buildPaletteItems({ ...base, resumeHref: '/resume-zh.pdf', linkedin: 'https://www.linkedin.com/in/x' });
    const ids = items.map((i) => i.id);
    expect(ids).toContain('action:resume');
    expect(ids).toContain('action:linkedin');
    expect(items.find((i) => i.id === 'action:resume')?.action).toEqual({ type: 'download', href: '/resume-zh.pdf' });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/fuzzy.test.ts tests/unit/palette.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `fuzzy.ts` and `palette.ts`**

`src/lib/fuzzy.ts`:

```ts
const BOUNDARY = /[\s\-_/.·]/;

/** Subsequence match score (higher is better); null when not all query characters appear in order. */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return 0;
  const t = text.toLowerCase();
  let score = 0;
  let from = 0;
  let prev = -2;
  for (const ch of q) {
    const found = t.indexOf(ch, from);
    if (found === -1) return null;
    score += 1;
    if (found === prev + 1) score += 3;
    if (found === 0 || BOUNDARY.test(t[found - 1] ?? '')) score += 2;
    prev = found;
    from = found + ch.length;
  }
  if (t.replace(/\s+/g, '').startsWith(q)) score += 5;
  return score;
}

export function fuzzyFilter<T>(items: readonly T[], query: string, text: (item: T) => string): T[] {
  if (!query.trim()) return [...items];
  return items
    .map((item, index) => ({ item, index, score: fuzzyScore(query, text(item)) }))
    .filter((r): r is { item: T; index: number; score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}
```

`src/lib/palette.ts`:

```ts
import { localizedPath, otherLocale, type Locale } from './i18n';

export type PaletteAction =
  | { type: 'navigate'; href: string }
  | { type: 'switch-lang'; target: Locale }
  | { type: 'copy'; text: string }
  | { type: 'external'; href: string }
  | { type: 'download'; href: string };

export interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  group: 'page' | 'project' | 'action';
  keywords: string;
  action: PaletteAction;
}

export interface PaletteItemLabels {
  home: string;
  work: string;
  about: string;
  switchLang: string;
  copyEmail: string;
  resume: string;
  github: string;
  linkedin: string;
  action: string;
}

export interface PaletteInput {
  lang: Locale;
  labels: PaletteItemLabels;
  projects: { slug: string; title: string; altTitle: string }[];
  email: string;
  github: string;
  linkedin?: string;
  resumeHref: string | null;
}

export function buildPaletteItems(input: PaletteInput): PaletteItem[] {
  const { lang, labels } = input;
  const page = (id: string, path: string, label: string, keywords: string): PaletteItem => ({
    id: `page:${id}`,
    label,
    hint: path === '/' ? '~/' : `~${path}`,
    group: 'page',
    keywords,
    action: { type: 'navigate', href: localizedPath(lang, path) },
  });
  const items: PaletteItem[] = [
    page('home', '/', labels.home, 'home 首頁 panspace'),
    page('work', '/work', labels.work, 'work projects portfolio 作品'),
    page('about', '/about', labels.about, 'about me experience awards skills 關於 經歷 獎項 技能'),
    ...input.projects.map<PaletteItem>((p) => ({
      id: `project:${p.slug}`,
      label: p.title,
      hint: `~/work/${p.slug}`,
      group: 'project',
      keywords: `${p.slug} ${p.altTitle}`,
      action: { type: 'navigate', href: localizedPath(lang, `/work/${p.slug}`) },
    })),
    {
      id: 'action:lang',
      label: labels.switchLang,
      hint: labels.action,
      group: 'action',
      keywords: 'language switch english chinese 語言 中文 英文',
      action: { type: 'switch-lang', target: otherLocale(lang) },
    },
    {
      id: 'action:email',
      label: labels.copyEmail,
      hint: input.email,
      group: 'action',
      keywords: 'email mail contact copy 聯絡 信箱 複製',
      action: { type: 'copy', text: input.email },
    },
  ];
  if (input.resumeHref) {
    items.push({ id: 'action:resume', label: labels.resume, hint: 'pdf', group: 'action', keywords: 'resume cv pdf 履歷', action: { type: 'download', href: input.resumeHref } });
  }
  items.push({ id: 'action:github', label: labels.github, hint: 'github.com/poterpan', group: 'action', keywords: 'github code source', action: { type: 'external', href: input.github } });
  if (input.linkedin) {
    items.push({ id: 'action:linkedin', label: labels.linkedin, hint: 'linkedin', group: 'action', keywords: 'linkedin profile', action: { type: 'external', href: input.linkedin } });
  }
  return items;
}
```

Run: `pnpm test tests/unit/fuzzy.test.ts tests/unit/palette.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing e2e test**

`tests/e2e/palette.spec.ts`:

```ts
import type { Page } from '@playwright/test';
import { BLOCK_STORAGE, expect, test } from './fixtures';
import { allPaths } from './routes';
import { localizedPath } from '../../src/lib/i18n';
import { LANG_KEY } from '../../src/lib/storage';

const hydrated = (page: Page) =>
  expect(page.locator('astro-island[component-url*="CommandPalette"]:not([ssr])')).toBeAttached();
const dialog = (page: Page) => page.locator('dialog.palette');
const input = (page: Page) => dialog(page).getByRole('combobox');
const options = (page: Page) => dialog(page).getByRole('option');

async function open(page: Page) {
  await hydrated(page);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(dialog(page)).toBeVisible();
}

test('Ctrl/⌘+K opens a combobox palette; Enter navigates to the match', async ({ page }) => {
  await page.goto('/zh');
  await open(page);
  await expect(input(page)).toBeFocused();
  await expect(input(page)).toHaveAttribute('aria-expanded', 'true');
  const listId = (await input(page).getAttribute('aria-controls'))!;
  await expect(page.locator(`[id="${listId}"]`)).toHaveAttribute('role', 'listbox');
  const firstId = (await options(page).first().getAttribute('id'))!;
  await expect(input(page)).toHaveAttribute('aria-activedescendant', firstId);
  await expect(options(page).first()).toHaveAttribute('aria-selected', 'true');
  await input(page).fill('chip');
  await expect(options(page).first()).toContainText('ChipPot');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/zh\/work\/chippot$/);
  await expect(dialog(page)).toBeHidden();
});

test('arrow keys move the active option and wrap', async ({ page }) => {
  await page.goto('/en');
  await open(page);
  await page.keyboard.press('ArrowDown');
  const second = options(page).nth(1);
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(input(page)).toHaveAttribute('aria-activedescendant', (await second.getAttribute('id'))!);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(options(page).last()).toHaveAttribute('aria-selected', 'true');
});

test('Esc closes and returns focus to the trigger', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the nav ⌘K trigger is a fine-pointer affordance');
  await page.goto('/en');
  await hydrated(page);
  const trigger = page.locator('.site-nav [data-palette-open]');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('slash opens; slash while typing inserts the character', async ({ page }) => {
  await page.goto('/en');
  await hydrated(page);
  await page.keyboard.press('/');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.type('a/b');
  await expect(input(page)).toHaveValue('a/b');
  await expect(dialog(page)).toBeVisible();
});

test('toggle closes: Ctrl/⌘+K while open closes it', async ({ page }) => {
  await page.goto('/en');
  await open(page);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(dialog(page)).toBeHidden();
});

test('focus is trapped inside the open palette', async ({ page }) => {
  await page.goto('/en');
  await open(page);
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  await expect(input(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(input(page)).toBeFocused();
});

test('switch language keeps the current page and remembers the choice', async ({ page }) => {
  await page.goto('/zh/work/chippot');
  await open(page);
  await input(page).fill('english');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/en\/work\/chippot$/);
  expect(await page.evaluate((k) => localStorage.getItem(k), LANG_KEY)).toBe('en');
});

test('switch language with storage blocked still works', async ({ page }) => {
  await page.addInitScript(BLOCK_STORAGE);
  await page.goto('/zh/about');
  await open(page);
  await input(page).fill('english');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/en\/about$/);
});

test('copy email', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'clipboard permission is desktop-only in this setup');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/en');
  await open(page);
  await input(page).fill('copy email');
  await page.keyboard.press('Enter');
  await expect(dialog(page).locator('.palette-status')).toHaveText('Email copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('poter.pan@panspace.me');
});

test('touch: a floating button opens the palette; desktop: it is not shown', async ({ page }, info) => {
  await page.goto('/zh');
  await hydrated(page);
  const fab = page.locator('.palette-fab');
  if (info.project.name === 'mobile') {
    await expect(fab).toBeVisible();
    await fab.tap();
    await expect(dialog(page)).toBeVisible();
  } else {
    await expect(fab).toBeHidden();
  }
});

test('reduced motion: opens without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  await open(page);
  expect(await dialog(page).evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
});

test('available on every page', async ({ page }) => {
  for (const path of allPaths()) {
    await page.goto(localizedPath('en', path));
    await open(page);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('no dead triggers are shown', async ({ page }) => {
    await page.goto('/zh');
    await expect(page.locator('[data-palette-open]')).toBeHidden();
    await expect(page.locator('.palette-fab')).toBeHidden();
  });
});
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/palette.spec.ts`
Expected: FAIL. The `CommandPalette` island isn't found, so `hydrated()` times out.

- [ ] **Step 6: Implement the island, mount it, add CSS**

`src/components/palette/CommandPalette.tsx`:

```tsx
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { navigate } from 'astro:transitions/client';
import { fuzzyFilter } from '../../lib/fuzzy';
import { switchLangPath } from '../../lib/i18n';
import type { PaletteItem } from '../../lib/palette';
import { LANG_KEY, safeSet } from '../../lib/storage';

export interface PaletteLabels {
  title: string;
  placeholder: string;
  listLabel: string;
  empty: string;
  open: string;
  copied: string;
}

interface Props {
  items: PaletteItem[];
  labels: PaletteLabels;
}

function isTypingTarget(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export default function CommandPalette({ items, labels }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);
  const listId = useId();
  const optionId = (i: number) => `${listId}-option-${i}`;
  const results = useMemo(() => fuzzyFilter(items, query, (i) => `${i.label} ${i.keywords}`), [items, query]);

  const open = useCallback(() => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    setQuery('');
    setActive(0);
    setStatus('');
    d.showModal();
    inputRef.current?.focus();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    setReady(true);
    const reveal = () =>
      document.querySelectorAll<HTMLElement>('[data-palette-open]').forEach((el) => {
        el.hidden = false;
      });
    const onKey = (e: KeyboardEvent) => {
      const d = dialogRef.current;
      if (!d) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (d.open) close();
        else open();
        return;
      }
      if (e.key === '/' && !d.open && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(document.activeElement)) {
        e.preventDefault();
        open();
      }
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest('[data-palette-open]')) open();
    };
    reveal();
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    document.addEventListener('astro:page-load', reveal);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
      document.removeEventListener('astro:page-load', reveal);
    };
  }, [open, close]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(item: PaletteItem): Promise<void> {
    const action = item.action;
    switch (action.type) {
      case 'navigate':
        close();
        await navigate(action.href);
        break;
      case 'switch-lang':
        safeSet(() => window.localStorage, LANG_KEY, action.target);
        close();
        await navigate(switchLangPath(window.location.pathname, action.target));
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(action.text);
          setStatus(labels.copied);
        } catch {
          window.location.href = `mailto:${action.text}`;
        }
        break;
      case 'external':
        close();
        window.open(action.href, '_blank', 'noopener');
        break;
      case 'download': {
        close();
        const link = document.createElement('a');
        link.href = action.href;
        link.download = '';
        document.body.append(link);
        link.click();
        link.remove();
        break;
      }
    }
  }

  function onInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>): void {
    const n = results.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (n ? (i + 1) % n : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (n ? (i - 1 + n) % n : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[active];
      if (item) void run(item);
    }
  }

  function onDialogKeyDown(e: ReactKeyboardEvent<HTMLDialogElement>): void {
    // Focus trap: the input is the only tabbable element; options are reached with arrow keys.
    if (e.key === 'Tab') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <button type="button" className="palette-fab" aria-label={labels.open} onClick={open} hidden={!ready}>
        ⌘K
      </button>
      <dialog
        ref={dialogRef}
        className="palette"
        aria-label={labels.title}
        onKeyDown={onDialogKeyDown}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="palette-panel">
          <input
            ref={inputRef}
            className="palette-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results.length ? optionId(active) : undefined}
            aria-label={labels.placeholder}
            placeholder={labels.placeholder}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <ul id={listId} role="listbox" aria-label={labels.listLabel} className="palette-list">
            {results.map((item, i) => (
              <li
                key={item.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className="palette-option"
                onMouseMove={() => setActive(i)}
                onClick={() => void run(item)}
              >
                <span>{item.label}</span>
                <span className="palette-hint">{item.hint}</span>
              </li>
            ))}
          </ul>
          {results.length === 0 && <p className="palette-empty">{labels.empty}</p>}
          <p className="sr-only" role="status" aria-live="polite">{status}</p>
          {status && <p className="palette-status" aria-hidden="true">{status}</p>}
        </div>
      </dialog>
    </>
  );
}
```

Replace `src/layouts/BaseLayout.astro` with:

```astro
---
import { ClientRouter } from 'astro:transitions';
import { Font } from 'astro:assets';
import '../styles/global.css';
import SeoHead from '../components/SeoHead.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import CommandPalette from '../components/palette/CommandPalette.tsx';
import { HTML_LANG, otherLocale, type Locale } from '../lib/i18n';
import { t } from '../i18n/ui';
import { getProfile, getProjects } from '../lib/content';
import { buildPaletteItems, type PaletteItem } from '../lib/palette';
import { resumeHref } from '../lib/resume';

interface Props {
  lang: Locale;
  path: string | null;
  title: string;
  description: string;
  noindex?: boolean;
}
const { lang, path, title, description, noindex = false } = Astro.props;

let paletteItems: PaletteItem[] | null = null;
if (path !== null) {
  const [projects, profile] = await Promise.all([getProjects(), getProfile()]);
  const other = otherLocale(lang);
  paletteItems = buildPaletteItems({
    lang,
    labels: {
      home: t(lang, 'palette.home'),
      work: t(lang, 'palette.work'),
      about: t(lang, 'palette.about'),
      switchLang: t(lang, 'palette.switchLang'),
      copyEmail: t(lang, 'palette.copyEmail'),
      resume: t(lang, 'palette.resume'),
      github: t(lang, 'palette.github'),
      linkedin: t(lang, 'palette.linkedin'),
      action: t(lang, 'palette.action'),
    },
    projects: projects.map((p) => ({ slug: p.slug, title: p.text[lang].data.title, altTitle: p.text[other].data.title })),
    email: profile.email,
    github: profile.socials.github,
    linkedin: profile.socials.linkedin,
    resumeHref: resumeHref(lang),
  });
}
const paletteLabels = {
  title: t(lang, 'palette.title'),
  placeholder: t(lang, 'palette.placeholder'),
  listLabel: t(lang, 'palette.listLabel'),
  empty: t(lang, 'palette.empty'),
  open: t(lang, 'palette.open'),
  copied: t(lang, 'palette.copied'),
};
---
<!doctype html>
<html lang={HTML_LANG[lang]} data-lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#07080a" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <SeoHead lang={lang} path={path} title={title} description={description} noindex={noindex} />
    <Font cssVariable="--font-geist" preload />
    <Font cssVariable="--font-geist-mono" />
    <ClientRouter />
    <slot name="head" />
  </head>
  <body>
    <a class="skip-link" href="#main">{t(lang, 'a11y.skip')}</a>
    <Nav lang={lang} path={path} />
    <main id="main" tabindex="-1" class="container-ps">
      <slot />
    </main>
    <Footer lang={lang} />
    {paletteItems && (
      <CommandPalette client:idle transition:persist={`palette-${lang}`} items={paletteItems} labels={paletteLabels} />
    )}
    <script>
      import '../scripts/global';
    </script>
  </body>
</html>
```

Append to `src/styles/global.css`:

```css
/* ---------- palette ---------- */
.palette {
  margin: 12vh auto auto; width: min(560px, calc(100vw - 32px)); max-height: 70vh; padding: 0;
  border: 1px solid #2a2f38; border-radius: 12px; background: #12151a; color: var(--color-text);
  box-shadow: 0 30px 80px #000c;
}
.palette::backdrop { background: #0008; backdrop-filter: blur(3px); }
@media (prefers-reduced-motion: no-preference) {
  .palette[open] { animation: palette-in 180ms ease-out; }
  .palette[open]::backdrop { animation: palette-fade 180ms ease-out; }
}
@keyframes palette-in { from { opacity: 0; transform: scale(0.96); } }
@keyframes palette-fade { from { opacity: 0; } }
.palette-input { width: 100%; background: none; border: 0; border-bottom: 1px solid var(--color-line); color: var(--color-text); padding: 14px 16px; font: 15px var(--font-sans); outline: none; }
.palette-list { max-height: 50vh; overflow: auto; margin: 0; padding: 6px; list-style: none; }
.palette-option { display: flex; justify-content: space-between; gap: 12px; padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 14px; }
.palette-option[aria-selected="true"] { background: #1b1f26; box-shadow: inset 0 0 0 1px var(--color-line-strong); }
.palette-hint { font: 11px var(--font-mono); color: var(--color-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.palette-empty, .palette-status { margin: 0; padding: 10px 16px; font-size: 13px; color: var(--color-muted); }
.palette-status { color: var(--color-accent); }
.palette-fab { display: none; }
@media (pointer: coarse) {
  .palette-fab {
    display: grid; place-items: center; position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 50;
    width: 52px; height: 52px; border-radius: 50%; background: var(--color-card); border: 1px solid var(--color-line-strong);
    color: var(--color-text); font: 600 13px var(--font-mono); box-shadow: 0 8px 24px #0008;
  }
  .kbd-hint { display: none; }
}
```

- [ ] **Step 7: Run tests to verify pass**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/fuzzy.ts src/lib/palette.ts src/components/palette/CommandPalette.tsx src/layouts/BaseLayout.astro src/styles/global.css tests/unit/fuzzy.test.ts tests/unit/palette.test.ts tests/e2e/palette.spec.ts
git commit -m "feat: add command palette with fuzzy search, shortcuts and touch button"
```

---
### Task 12: SEO — OG images, JSON-LD, Open Graph tags, sitemap, robots

**Files:**
- Create: `src/lib/og.ts`, `src/pages/og/[lang]/site.png.ts`, `src/pages/og/[lang]/work/[slug].png.ts`, `public/robots.txt`, `tests/unit/og.test.ts`, `tests/e2e/seo.spec.ts`
- Modify: `src/lib/seo.ts`, `tests/unit/seo.test.ts`, `src/components/SeoHead.astro`, `src/layouts/BaseLayout.astro`, `src/pages/[lang]/index.astro`, `src/pages/[lang]/about.astro`, `src/pages/[lang]/work/[slug].astro`, `src/pages/index.astro`, `astro.config.mjs`

**Interfaces:**
- Consumes: `SITE`, `canonicalUrl`, `alternateLinks` (Task 3); `HTML_LANG`, `langPaths`, `otherLocale` (Task 1); `getProjects`, `getProfile` (Task 2); `categoryLabel` (Task 3).
- Produces:
  - `src/lib/seo.ts` additions: `OG_LOCALE: Record<Locale, string>` (`zh_TW`, `en_US`), `ogImageUrl(lang: Locale, slug?: string): string`, `personJsonLd(input: { name; url; email; description; location; sameAs: string[] }): Record<string, unknown>`, `projectJsonLd(input: { name; description; url; image; dateCreated; inLanguage; keywords: string[]; authorName; authorUrl }): Record<string, unknown>`, `jsonLdScript(data: unknown): string` (escapes `<`)
  - `src/lib/og.ts`: `interface OgCard { eyebrow: string; title: string; subtitle: string; footer: string }`, `renderOgPng(card: OgCard): Promise<Uint8Array>`
  - Static files `/og/{lang}/site.png` and `/og/{lang}/work/{slug}.png` (1200×630)
  - `BaseLayout` new optional props: `ogImage?: string` (default `ogImageUrl(lang)`), `ogType?: 'website' | 'article'` (default `'website'`), `jsonLd?: Record<string, unknown>[]`

- [ ] **Step 1: Write failing unit tests**

Replace the import line at the top of `tests/unit/seo.test.ts` with:

```ts
import { SITE, alternateLinks, canonicalUrl, jsonLdScript, ogImageUrl, personJsonLd, projectJsonLd } from '../../src/lib/seo';
```

and append to the same file:

```ts
describe('OG and JSON-LD helpers', () => {
  it('builds absolute OG image URLs', () => {
    expect(ogImageUrl('zh')).toBe('https://panspace.me/og/zh/site.png');
    expect(ogImageUrl('en', 'chippot')).toBe('https://panspace.me/og/en/work/chippot.png');
  });
  it('builds a Person', () => {
    const p = personJsonLd({
      name: 'Poter Pan', url: 'https://panspace.me/en', email: 'poter.pan@panspace.me',
      description: 'I build products that ship.', location: 'Taipei, Taiwan', sameAs: ['https://github.com/poterpan'],
    });
    expect(p).toMatchObject({ '@context': 'https://schema.org', '@type': 'Person', name: 'Poter Pan', email: 'mailto:poter.pan@panspace.me' });
    expect(p.sameAs).toEqual(['https://github.com/poterpan']);
  });
  it('builds a CreativeWork', () => {
    const w = projectJsonLd({
      name: 'ChipPot', description: 'd', url: 'https://panspace.me/en/work/chippot', image: 'https://panspace.me/og/en/work/chippot.png',
      dateCreated: '2025-01', inLanguage: 'en', keywords: ['TypeScript', 'D1'], authorName: 'Poter Pan', authorUrl: 'https://panspace.me/en',
    });
    expect(w).toMatchObject({ '@type': 'CreativeWork', name: 'ChipPot', keywords: 'TypeScript, D1', author: { '@type': 'Person', name: 'Poter Pan' } });
  });
  it('escapes < so JSON-LD cannot close the script tag', () => {
    expect(jsonLdScript({ a: '</script><b>' })).toBe('{"a":"\\u003c/script>\\u003cb>"}');
  });
});
```

`tests/unit/og.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { renderOgPng } from '../../src/lib/og';

describe('renderOgPng', () => {
  it('renders a 1200×630 PNG with mixed CJK/Latin text', async () => {
    const png = await renderOgPng({
      eyebrow: '~/work/ntutbox',
      title: 'NTUTBox 北科盒子',
      subtitle: '已上架 App Store 的北科課表 App。',
      footer: 'panspace.me · iOS · Web',
    });
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);
  }, 120_000);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/seo.test.ts tests/unit/og.test.ts`
Expected: FAIL. `ogImageUrl` isn't exported, and `../../src/lib/og` isn't found.

- [ ] **Step 3: Implement the SEO helpers and the OG renderer**

Append to `src/lib/seo.ts`:

```ts
export const OG_LOCALE: Record<Locale, string> = { zh: 'zh_TW', en: 'en_US' };

export function ogImageUrl(lang: Locale, slug?: string): string {
  return slug ? `${SITE}/og/${lang}/work/${slug}.png` : `${SITE}/og/${lang}/site.png`;
}

export function personJsonLd(input: {
  name: string;
  url: string;
  email: string;
  description: string;
  location: string;
  sameAs: string[];
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: input.name,
    url: input.url,
    email: `mailto:${input.email}`,
    description: input.description,
    homeLocation: { '@type': 'Place', name: input.location },
    sameAs: input.sameAs,
  };
}

export function projectJsonLd(input: {
  name: string;
  description: string;
  url: string;
  image: string;
  dateCreated: string;
  inLanguage: string;
  keywords: string[];
  authorName: string;
  authorUrl: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    dateCreated: input.dateCreated,
    inLanguage: input.inLanguage,
    keywords: input.keywords.join(', '),
    author: { '@type': 'Person', name: input.authorName, url: input.authorUrl },
  };
}

export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
```

`src/lib/og.ts`. Satori needs .woff/.ttf, not .woff2, which is why the static `@fontsource/*` packages are used. Every Noto Sans TC unicode-range chunk gets a **unique** font name: satori then falls back glyph-by-glyph across all loaded fonts. With a shared name, CJK renders as tofu boxes (verified).

```ts
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export interface OgCard {
  eyebrow: string;
  title: string;
  subtitle: string;
  footer: string;
}

type FontDef = { name: string; data: Buffer; weight: 400 | 700; style: 'normal' };
type Node = { type: string; props: { style: Record<string, unknown>; children?: unknown } };

const FONT_ROOT = join(process.cwd(), 'node_modules', '@fontsource');
let fontsPromise: Promise<FontDef[]> | undefined;

async function loadFonts(): Promise<FontDef[]> {
  const file = (pkg: string, name: string) => readFile(join(FONT_ROOT, pkg, 'files', name));
  const tcDir = join(FONT_ROOT, 'noto-sans-tc', 'files');
  const tcFiles = (await readdir(tcDir)).filter((f) => /^noto-sans-tc-\d+-(400|700)-normal\.woff$/.test(f));
  const tc = await Promise.all(
    tcFiles.map(async (f): Promise<FontDef> => ({
      name: `Noto Sans TC ${f}`,
      data: await readFile(join(tcDir, f)),
      weight: f.includes('-700-') ? 700 : 400,
      style: 'normal',
    })),
  );
  return [
    { name: 'Geist', data: await file('geist', 'geist-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'Geist', data: await file('geist', 'geist-latin-700-normal.woff'), weight: 700, style: 'normal' },
    { name: 'Geist Mono', data: await file('geist-mono', 'geist-mono-latin-400-normal.woff'), weight: 400, style: 'normal' },
    ...tc,
  ];
}

const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

export async function renderOgPng(card: OgCard): Promise<Uint8Array> {
  fontsPromise ??= loadFonts();
  const fonts = await fontsPromise;
  const tree = h(
    'div',
    {
      width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72,
      backgroundColor: '#07080a', color: '#e7e9ee', fontFamily: 'Geist',
      backgroundImage: 'linear-gradient(#ffffff0a 1px, transparent 1px), linear-gradient(90deg, #ffffff0a 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    },
    [
      h('div', { display: 'flex', fontFamily: 'Geist Mono', fontSize: 28, color: '#34d399' }, card.eyebrow),
      h('div', { display: 'flex', flexDirection: 'column' }, [
        h('div', { display: 'block', fontSize: 72, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, lineClamp: 2 }, card.title),
        h('div', { display: 'block', fontSize: 32, color: '#8a909c', lineHeight: 1.4, marginTop: 20, lineClamp: 2 }, card.subtitle),
      ]),
      h('div', { display: 'flex', alignItems: 'center', fontFamily: 'Geist Mono', fontSize: 24, color: '#8a909c' }, [
        h('div', { width: 14, height: 14, borderRadius: 7, backgroundColor: '#34d399', marginRight: 14 }),
        card.footer,
      ]),
    ],
  );
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
```

Run: `pnpm test tests/unit/seo.test.ts tests/unit/og.test.ts`
Expected: PASS. The first OG render takes a few seconds while the fonts load.

- [ ] **Step 4: Write the failing e2e test**

`tests/e2e/seo.spec.ts`:

```ts
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { allPaths, orderedSlugs } from './routes';
import { LOCALES, localizedPath } from '../../src/lib/i18n';

const jsonLd = (page: Page) =>
  page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? '{}')));

for (const lang of LOCALES) {
  for (const path of allPaths()) {
    const url = localizedPath(lang, path);
    test(`${url}: Open Graph tags and a reachable OG image`, async ({ page, request }) => {
      await page.goto(url);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://panspace.me${url}`);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
      const image = (await page.locator('meta[property="og:image"]').getAttribute('content'))!;
      const res = await request.get(new URL(image).pathname);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    });
  }
}

test('home and about carry Person JSON-LD', async ({ page }) => {
  for (const url of ['/zh', '/en/about']) {
    await page.goto(url);
    const person = (await jsonLd(page)).find((d) => d['@type'] === 'Person');
    expect(person?.name).toBe('Poter Pan');
    expect(person?.sameAs).toContain('https://github.com/poterpan');
  }
});

test('project pages carry CreativeWork JSON-LD and a per-project OG image', async ({ page }) => {
  for (const slug of orderedSlugs()) {
    await page.goto(`/en/work/${slug}`);
    const work = (await jsonLd(page)).find((d) => d['@type'] === 'CreativeWork');
    expect(work?.name).toBe(await page.locator('h1.project-title').textContent());
    expect(work?.inLanguage).toBe('en');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `https://panspace.me/og/en/work/${slug}.png`);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  }
});

test('sitemap lists every page with hreflang alternates and nothing else', async ({ request }) => {
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
  const xml = await (await request.get('/sitemap-0.xml')).text();
  for (const lang of LOCALES) {
    for (const path of allPaths()) expect(xml).toContain(`<loc>https://panspace.me${localizedPath(lang, path)}</loc>`);
  }
  expect(xml).toContain('hreflang="zh-Hant"');
  expect(xml).toContain('hreflang="en"');
  expect(xml).not.toContain('/og/');
  expect(xml).not.toContain('404');
});

test('robots.txt points to the sitemap', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://panspace.me/sitemap-index.xml');
});

test('the root redirector declares alternates', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('hreflang="x-default"');
  expect(html).toContain('href="https://panspace.me/zh"');
});
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/seo.spec.ts`
Expected: FAIL, `og:url` meta not found.

- [ ] **Step 6: Wire OG endpoints, head tags, JSON-LD, sitemap and robots**

`src/pages/og/[lang]/site.png.ts`:

```ts
import type { APIRoute, GetStaticPaths } from 'astro';
import { getProfile } from '../../../lib/content';
import { langPaths, type Locale } from '../../../lib/i18n';
import { renderOgPng } from '../../../lib/og';

export const getStaticPaths = (() => langPaths()) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Locale;
  const profile = await getProfile();
  const png = await renderOgPng({ eyebrow: '~/panspace', title: profile.name[lang], subtitle: profile.tagline[lang], footer: 'panspace.me' });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
```

`src/pages/og/[lang]/work/[slug].png.ts`:

```ts
import type { APIRoute, GetStaticPaths } from 'astro';
import { getProjects, type ProjectEntry } from '../../../../lib/content';
import { LOCALES, type Locale } from '../../../../lib/i18n';
import { categoryLabel } from '../../../../i18n/ui';
import { renderOgPng } from '../../../../lib/og';

export const getStaticPaths = (async () => {
  const projects = await getProjects();
  return projects.flatMap((project) => LOCALES.map((lang) => ({ params: { lang, slug: project.slug }, props: { project } })));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, props }) => {
  const lang = params.lang as Locale;
  const { project } = props as { project: ProjectEntry };
  const text = project.text[lang].data;
  const png = await renderOgPng({
    eyebrow: `~/work/${project.slug}`,
    title: text.title,
    subtitle: text.summary,
    footer: ['panspace.me', ...project.meta.categories.map((c) => categoryLabel(lang, c))].join(' · '),
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
```

Replace `src/components/SeoHead.astro` with:

```astro
---
import { OG_LOCALE, alternateLinks, canonicalUrl, jsonLdScript } from '../lib/seo';
import { otherLocale, type Locale } from '../lib/i18n';

interface Props {
  lang: Locale;
  path: string | null;
  title: string;
  description: string;
  noindex: boolean;
  ogImage: string;
  ogType: 'website' | 'article';
  jsonLd: Record<string, unknown>[];
}
const { lang, path, title, description, noindex, ogImage, ogType, jsonLd } = Astro.props;
---
<title>{title}</title>
<meta name="description" content={description} />
{noindex && <meta name="robots" content="noindex" />}
{path !== null && <link rel="canonical" href={canonicalUrl(lang, path)} />}
{path !== null && alternateLinks(path).map((l) => <link rel="alternate" hreflang={l.hreflang} href={l.href} />)}
<meta property="og:type" content={ogType} />
<meta property="og:site_name" content="Pan's Space" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
{path !== null && <meta property="og:url" content={canonicalUrl(lang, path)} />}
<meta property="og:image" content={ogImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content={OG_LOCALE[lang]} />
<meta property="og:locale:alternate" content={OG_LOCALE[otherLocale(lang)]} />
<meta name="twitter:card" content="summary_large_image" />
{jsonLd.map((d) => <script type="application/ld+json" set:html={jsonLdScript(d)} />)}
```

In `src/layouts/BaseLayout.astro`:
- add `import { ogImageUrl } from '../lib/seo';` to the imports;
- extend `Props` with `ogImage?: string; ogType?: 'website' | 'article'; jsonLd?: Record<string, unknown>[];`;
- replace the destructuring line with
  `const { lang, path, title, description, noindex = false, ogImage = ogImageUrl(lang), ogType = 'website', jsonLd = [] } = Astro.props;`
- replace the `<SeoHead … />` element with
  `<SeoHead lang={lang} path={path} title={title} description={description} noindex={noindex} ogImage={ogImage} ogType={ogType} jsonLd={jsonLd} />`

In `src/pages/[lang]/index.astro`, add `import { canonicalUrl, personJsonLd } from '../../lib/seo';` and add this prop to `<BaseLayout …>`:

```astro
  jsonLd={[personJsonLd({
    name: profile.name[lang], url: canonicalUrl(lang, '/'), email: profile.email, description: profile.tagline[lang],
    location: profile.location[lang], sameAs: [profile.socials.github, profile.socials.linkedin].filter((u): u is string => Boolean(u)),
  })]}
```

In `src/pages/[lang]/about.astro`, make the same two changes (same import, same `jsonLd` prop).

In `src/pages/[lang]/work/[slug].astro`:
- add imports `import { HTML_LANG } from '../../../lib/i18n';` (merge into the existing `i18n` import), `import { canonicalUrl, ogImageUrl, projectJsonLd } from '../../../lib/seo';`, and `import { getProfile } from '../../../lib/content';` (merge into the existing `content` import);
- add `const profile = await getProfile();` after `const links = …`;
- add these props to `<BaseLayout …>`:

```astro
  ogImage={ogImageUrl(lang, project.slug)}
  ogType="article"
  jsonLd={[projectJsonLd({
    name: body.data.title, description: body.data.summary, url: canonicalUrl(lang, `/work/${project.slug}`),
    image: ogImageUrl(lang, project.slug), dateCreated: project.meta.date, inLanguage: HTML_LANG[lang],
    keywords: project.meta.stack, authorName: profile.name[lang], authorUrl: canonicalUrl(lang, '/'),
  })]}
```

In `src/pages/index.astro`, add inside `<head>` after the `<title>`:

```astro
    <link rel="canonical" href="https://panspace.me/" />
    <link rel="alternate" hreflang="zh-Hant" href="https://panspace.me/zh" />
    <link rel="alternate" hreflang="en" href="https://panspace.me/en" />
    <link rel="alternate" hreflang="x-default" href="https://panspace.me/" />
```

`public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://panspace.me/sitemap-index.xml
```

`astro.config.mjs`: add `import sitemap from '@astrojs/sitemap';` and change the integrations line to:

```js
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/og/') && !page.includes('/404') && page !== 'https://panspace.me/' && page !== 'https://panspace.me',
      i18n: { defaultLocale: 'zh', locales: { zh: 'zh-Hant', en: 'en' } },
    }),
  ],
```

- [ ] **Step 7: Run tests to verify pass, and eyeball the OG images**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: all pass. The build log lists `/og/zh/site.png`, `/og/en/site.png` and `/og/{zh,en}/work/<slug>.png`.

Open `dist/og/zh/work/ntutbox.png` and `dist/og/en/site.png` in an image viewer. Expected: a dark grid background, a green mono eyebrow, a white title, CJK glyphs that render (no ☒ boxes), and a green dot footer.

- [ ] **Step 8: Commit**

```bash
git add src/lib/seo.ts src/lib/og.ts "src/pages/og" src/components/SeoHead.astro src/layouts/BaseLayout.astro "src/pages/[lang]/index.astro" "src/pages/[lang]/about.astro" "src/pages/[lang]/work/[slug].astro" src/pages/index.astro public/robots.txt astro.config.mjs tests/unit/seo.test.ts tests/unit/og.test.ts tests/e2e/seo.spec.ts
git commit -m "feat: add OG images, JSON-LD, Open Graph tags, sitemap and robots.txt"
```

---

### Task 13: 404 page, cookieless analytics beacon, cache headers

**Files:**
- Create: `src/pages/404.astro`, `src/lib/analytics.ts`, `src/components/BeaconScript.astro`, `src/env.d.ts`, `public/_headers`, `tests/unit/analytics.test.ts`, `tests/e2e/notfound.spec.ts`, `tests/e2e/platform.spec.ts`
- Modify: `src/layouts/BaseLayout.astro`, `src/styles/global.css` (append "404")

**Interfaces:**
- Consumes: `BaseLayout` with `path={null}` (no hreflang, no canonical, no palette) (Tasks 3/11); `.boot-prompt` style (Task 6).
- Produces:
  - `/404` page (served with HTTP 404 by Workers `not_found_handling: "404-page"`). `[data-missing-path]` shows the requested path.
  - `src/lib/analytics.ts`: `beaconConfig(token: string | undefined): string | null`. With a token, the beacon `<script>` is emitted in every page head; without one, nothing is emitted. The build variable `PUBLIC_CF_BEACON_TOKEN` is set in Workers Builds (Task 16).
  - `public/_headers`: immutable caching for `/_astro/*`, `nosniff` and `Referrer-Policy` everywhere.

- [ ] **Step 1: Write the failing unit test**

`tests/unit/analytics.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { beaconConfig } from '../../src/lib/analytics';

describe('beaconConfig', () => {
  it('is null without a token', () => {
    expect(beaconConfig(undefined)).toBeNull();
    expect(beaconConfig('   ')).toBeNull();
  });
  it('serializes the token for data-cf-beacon', () => {
    expect(beaconConfig(' abc123 ')).toBe('{"token":"abc123"}');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/analytics.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/analytics.ts`, `src/env.d.ts`, `BeaconScript.astro`**

`src/lib/analytics.ts`:

```ts
/** Cloudflare Web Analytics is cookieless. Returns the data-cf-beacon JSON, or null to emit nothing. */
export function beaconConfig(token: string | undefined): string | null {
  const t = token?.trim();
  return t ? JSON.stringify({ token: t }) : null;
}
```

`src/env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly PUBLIC_CF_BEACON_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`src/components/BeaconScript.astro`. No `integrity` attribute: Cloudflare doesn't version-pin the manual beacon script, so SRI can't be used with it (Cloudflare Web Analytics FAQ).

```astro
---
import { beaconConfig } from '../lib/analytics';

const config = beaconConfig(import.meta.env.PUBLIC_CF_BEACON_TOKEN);
---
{config && <script is:inline defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={config}></script>}
```

In `src/layouts/BaseLayout.astro`: add `import BeaconScript from '../components/BeaconScript.astro';` and insert `<BeaconScript />` on the line after `<ClientRouter />`.

Run: `pnpm test tests/unit/analytics.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing e2e tests**

`tests/e2e/notfound.spec.ts`:

```ts
import { expect, test } from './fixtures';

test('unknown URLs return 404 with the OS-style page', async ({ page, request }) => {
  for (const url of ['/zh/nope', '/en/work/does-not-exist', '/totally/unknown']) {
    // Workers serves 404.html for navigation requests, so send the header a browser would.
    const res = await request.get(url, { headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' } });
    expect(res.status()).toBe(404);
    expect(await res.text()).toContain('command not found');
  }
  const response = await page.goto('/en/work/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.locator('[data-missing-path]')).toHaveText('/en/work/does-not-exist');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('.nf-links a[href="/zh"]')).toBeVisible();
  await expect(page.locator('.nf-links a[href="/en"]')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
```

`tests/e2e/platform.spec.ts`:

```ts
import { expect, test } from './fixtures';
import { allPaths } from './routes';
import { localizedPath } from '../../src/lib/i18n';

test('hashed assets are cached immutably; pages are nosniff', async ({ page, request }) => {
  const res = await request.get('/zh');
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
  await page.goto('/zh');
  const src = await page.locator('script[type="module"][src^="/_astro/"]').first().getAttribute('src');
  const asset = await request.get(src!);
  expect(asset.headers()['cache-control']).toContain('immutable');
});

test('no cookies are set anywhere (analytics is cookieless)', async ({ page, context }) => {
  for (const path of allPaths()) await page.goto(localizedPath('zh', path));
  expect(await context.cookies()).toEqual([]);
});

test('without a beacon token no analytics script is emitted', async ({ page }) => {
  test.skip(!!process.env.PUBLIC_CF_BEACON_TOKEN, 'token configured for this build');
  await page.goto('/en');
  await expect(page.locator('script[src*="cloudflareinsights"]')).toHaveCount(0);
});
```

- [ ] **Step 5: Run to verify failure**

Run: `pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e tests/e2e/notfound.spec.ts tests/e2e/platform.spec.ts`
Expected: FAIL. The 404 body doesn't contain `command not found` (no `404.html` yet), and `x-content-type-options` is undefined.

- [ ] **Step 6: Implement the 404 page and headers**

`src/pages/404.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout lang="en" path={null} title="404 · command not found — Pan's Space" description="This page does not exist." noindex>
  <section class="section not-found">
    <h1 class="page-title">404</h1>
    <div class="nf-term" aria-label="Terminal">
      <p><span class="boot-prompt">$ </span>cd <span data-missing-path>this-page</span></p>
      <p class="nf-error">zsh: command not found</p>
      <p class="mono-path">找不到這個頁面 · This page doesn't exist.</p>
    </div>
    <ul class="nf-links">
      <li><a href="/zh">~/zh — 回首頁</a></li>
      <li><a href="/en">~/en — Home</a></li>
      <li><a href="/zh/work">~/zh/work — 作品</a></li>
      <li><a href="/en/work">~/en/work — Work</a></li>
    </ul>
  </section>
  <script>
    function showPath(): void {
      const el = document.querySelector('[data-missing-path]');
      if (el) el.textContent = window.location.pathname;
    }
    document.addEventListener('astro:page-load', showPath);
  </script>
</BaseLayout>
```

`public/_headers`:

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

Append to `src/styles/global.css`:

```css
/* ---------- 404 ---------- */
.nf-term { background: #0e1013; border: 1px solid var(--color-line); border-radius: 12px; padding: 16px 18px; font: 14px/1.8 var(--font-mono); max-width: 560px; }
.nf-term p { margin: 0; }
.nf-error { color: #f87171; }
.nf-links { list-style: none; padding: 0; margin: 24px 0 0; display: grid; gap: 8px; font-family: var(--font-mono); }
.nf-links a { color: var(--color-accent); text-decoration: none; }
```

- [ ] **Step 7: Run tests to verify pass; check the token build path**

Run: `pnpm check && pnpm test && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: all pass.

Run: `PUBLIC_CF_BEACON_TOKEN=test-token pnpm build && grep -c 'cloudflareinsights.com/beacon.min.js' dist/zh.html; pnpm build`
Expected: `1`. The final `pnpm build` restores a token-less `dist/`.

- [ ] **Step 8: Commit**

```bash
git add src/pages/404.astro src/lib/analytics.ts src/components/BeaconScript.astro src/env.d.ts public/_headers src/layouts/BaseLayout.astro src/styles/global.css tests/unit/analytics.test.ts tests/e2e/notfound.spec.ts tests/e2e/platform.spec.ts
git commit -m "feat: add 404 page, cookieless analytics beacon and cache headers"
```

---
### Task 14: Draft the full zh + en content from GitHub READMEs (user review gate)

**Files:**
- Create: `src/content/projects/{spine-ai,locmotion,taipei-traffic-risk-map,ar-campus-tour,fcu-checkin-app,healthy-baby,incognito-earth,love-home,focus-moment,asr-server}/{meta.yaml,zh.mdx,en.mdx,images/*}`
- Modify: `src/content/projects/{ntutbox,chippot,basketball-analysis}/*` (replace seed copy and covers), `src/content/profile.yaml`, `src/content/experience.yaml`, `src/content/awards.yaml`, `content-policy/denylist.json`
- Optional (only if the user supplies them): `public/resume-zh.pdf`, `public/resume-en.pdf`, `src/content/profile-photo.jpg` (referenced as `photo: ./profile-photo.jpg` in `profile.yaml`)

**Interfaces:**
- Consumes: every schema in `src/lib/schemas.ts` (Task 2); MDX components `Stat`, `Gallery`, `Compare`, `Diagram` (Task 7); the fixed section headings (Task 7 `project-structure.test.ts`); `scripts/make-cover.mjs`, `scripts/denylist-add.mjs` (Task 2).
- Produces: the complete first-version content from spec §6. Nothing downstream depends on new code.

**Content rules (re-read before writing, from spec §5/§6):**
- Every project gets `meta.yaml` + `zh.mdx` + `en.mdx` with the five fixed sections in order. `summary` ≤ 220 characters.
- **Confidential** (`basketball-analysis`): no client/vendor/brand names, no product names that identify the client, no GitHub link, no real UI screenshots (they can expose client branding). Use `make-cover.mjs` or a self-drawn `<Diagram>`.
- **Spine AI:** the partner is 「醫學中心」 / "a medical center". Never the hospital or department name, never doctors' names, **no real X-ray images** unless the user explicitly confirms an image is de-identified and cleared for publication.
- Only convincing numbers (e.g. dataset sizes, accuracy, latency, coverage). **No install/download counts** (the FCU check-in app's install count is never written). `<Stat>` is reserved for convincing numbers.
- Never publish: phone numbers, family background, birth data, contract scans, student IDs, grey-area repos (ticket grabbing, course selection, auto check-in, etc.). Only link to repos in `ALLOWED_REPOS` (`scripts/content-policy.mjs`).
- zh uses full-width punctuation and natural Taiwanese phrasing. en is natural, not a literal translation. No superlatives you can't back with a source.
- Read private READMEs into a scratch directory **outside the repo**. Never copy private README text, private repo names, or internal URLs into committed files.

- [ ] **Step 1: Collect sources into a scratch directory**

```bash
SRC="${TMPDIR:-/tmp}/panspace-sources"; mkdir -p "$SRC"
gh repo list poterpan --limit 300 --json name,visibility,description,url > "$SRC/repos.json"
for r in ChipPot LocMotion ntutbox-website ntutbox-course ntutbox-checkin ntutbox-template-api taipei-traffic-risk-map ntut-ar-campus-tour asr-server IncognitoEarth BaeMoments poterpan; do
  gh api "repos/poterpan/$r/readme" -H 'Accept: application/vnd.github.raw' > "$SRC/$r.md" 2>/dev/null || echo "no README: $r"
done
jq -r '.[] | select(.visibility=="PRIVATE") | .name' "$SRC/repos.json" | grep -iE 'ntutbox|spine|radiopaque|cervical|basketball|signin|healthy|uptime' > "$SRC/private-candidates.txt"
while read -r r; do gh api "repos/poterpan/$r/readme" -H 'Accept: application/vnd.github.raw' > "$SRC/private-$r.md" 2>/dev/null || echo "no README: $r"; done < "$SRC/private-candidates.txt"
ls "$SRC"
```

Expected: one `.md` per repo that has a README. Read them all before drafting.

- [ ] **Step 2: Ask the user for what the READMEs can't answer (blocking)**

Send the user one message with these questions and wait for answers. Don't guess.
1. LinkedIn URL (or "omit": the palette and status bar hide it automatically).
2. Display name in Chinese for the zh pages, or keep "Poter Pan".
3. Education entries: school, department/degree, start and end (YYYY-MM). Work / research-assistant / freelance entries the same way.
4. Awards and papers: year, name, rank, organizer (zh + en if available).
5. App Store URL for NTUTBox.
6. Which repo (if any) is the FCU 簽到 App, and where material for 健康寶寶, 享愛家園 and 專注時刻 lives (repo, slides, or a short description from the user).
7. Freelance status for launch: `open` or `busy`.
8. Terms that must never appear: hospital name(s), the basketball client's and vendors' names, phone number, student IDs, and any others. The user may paste them in chat. Add each with `node scripts/denylist-add.mjs '<term>'` and never repeat them back.
9. Whether to include the résumé PDFs and a profile photo now (spec §12 allows adding them later).

- [ ] **Step 3: Extend the denylist from the sources**

Scan the private READMEs for organization, hospital, client, vendor and person names. Add each with `node scripts/denylist-add.mjs '<term>'` (Latin and CJK spellings separately, full and short forms). Then:

Run: `pnpm test tests/unit/content-safety.test.ts`
Expected: PASS (the seed content contains none of them).

- [ ] **Step 4: Write `meta.yaml` for every project (spec §6)**

| slug | title (zh / en) | categories | featured / bento | other meta | sources |
|---|---|---|---|---|---|
| `ntutbox` | NTUTBox 北科盒子 / NTUTBox | `[ios, web]` | 1 / `wide` | `links.website: https://ntutbox.com`, `links.appStore` (from user) | private app repo, `ntutbox-website`, `ntutbox-course`, `ntutbox-checkin`, `ntutbox-template-api`, status-page repo (private) |
| `spine-ai` | 脊椎 X 光 AI / Spine X-ray AI | `[ai, research]` | 2 / `regular` | no `links` (private code) | private spine repos |
| `chippot` | ChipPot | `[web]` | 3 / `regular` | `links.github: https://github.com/poterpan/ChipPot` | `ChipPot` |
| `basketball-analysis` | 籃球動作分析 / Basketball Motion Analysis | `[ai, web]` | 4 / `regular` | `confidential: true`, no `links` | private basketball repos |
| `locmotion` | LocMotion | `[ios, web]` | 5 / `regular` | `links.github: https://github.com/poterpan/LocMotion` | `LocMotion` |
| `taipei-traffic-risk-map` | 台北交通風險地圖 / Taipei Traffic Risk Map | per README (`web`, plus `ai` if it models risk) | — | `links.github` | `taipei-traffic-risk-map` |
| `ar-campus-tour` | AR 校園導覽 / AR Campus Tour | `[ios]` | — | `links.github: https://github.com/poterpan/ntut-ar-campus-tour` | `ntut-ar-campus-tour` |
| `fcu-checkin-app` | FCU 簽到 App / FCU Check-in App | `[ios]` | — | no install count anywhere; link only if the repo is public **and** in `ALLOWED_REPOS` | user answer (Step 2.6) |
| `healthy-baby` | 健康寶寶 / Healthy Baby | `[competition]` (+ `ios`/`web` per source) | — | — | private repo + user |
| `incognito-earth` | 無痕地球 / Incognito Earth | `[competition]` (+ platform per README) | — | `links.github: https://github.com/poterpan/IncognitoEarth` | `IncognitoEarth` |
| `love-home` | 享愛家園 / (English name from source) | `[competition]` | — | — | user |
| `focus-moment` | 專注時刻 / (English name from source) | `[competition]` | — | — | user |
| `asr-server` | asr-server | `[ai]` | — (`listOrder: 1`) | `links.github: https://github.com/poterpan/asr-server` | `asr-server` |

Dates (`date`, `end`) come from the sources: README, releases, or as a fallback the repo creation month from `gh repo view poterpan/<repo> --json createdAt -q .createdAt`. `role` and `stack` come from the README. `coverAlt` describes the cover image in each language.

- [ ] **Step 5: Produce cover images and in-body screenshots**

Order of preference for each project:
1. Images already in a **public** repo: `gh api repos/poterpan/<repo>/contents/<path> -H 'Accept: application/vnd.github.raw' > src/content/projects/<slug>/images/<name>.png`
2. A screenshot of a **public** live site: `pnpm exec playwright screenshot --viewport-size "1600, 900" https://ntutbox.com src/content/projects/ntutbox/images/cover.png`
3. A generated cover: `node scripts/make-cover.mjs src/content/projects/<slug>/images/cover.png '#0f1b33' '~/work/<slug>'`

`basketball-analysis` uses option 3 only. `spine-ai` uses option 3 plus an inline-SVG `<Diagram>` of the pipeline, unless the user cleared a specific image. Covers should be at least 1600×900.

- [ ] **Step 6: Write `zh.mdx` and `en.mdx` for every project**

Use this skeleton for each file (headings are fixed; body text comes from the sources):

```mdx
---
title: <title>
summary: <≤220 chars, the one-line pitch>
---
import cover from './images/cover.png';

## 背景與問題

<who had what problem, in 1–3 short paragraphs>

## 我的角色

<what you personally owned>

## 做法與技術決策

<architecture, key decisions and trade-offs; use <Diagram> for architecture>

## 成果

<shipped outcome; <Stat> only for convincing numbers; <Gallery> for screenshots>

## 學到什麼

<1–2 concrete lessons>
```

(en uses `## Background & problem`, `## My role`, `## Approach & technical decisions`, `## Outcome`, `## What I learned`.)

- [ ] **Step 7: Complete `profile.yaml`, `experience.yaml`, `awards.yaml`**

Fill them from the user's answers (Step 2) and the `poterpan/poterpan` profile README. `experience.yaml` keeps the three confirmed iOS Club entries (spec §6) and adds education, work, research-assistant and freelance entries. Each entry needs `id`, `type`, `start`, `end`, `title`, `org`, `description` in zh and en. Location facts: graduate school in Taipei, undergraduate years in Taichung (spec §6). If the user supplied a photo, add `photo: ./profile-photo.jpg` and the file.

- [ ] **Step 8: Verify**

Run: `pnpm test && pnpm check && pnpm build && E2E_SKIP_BUILD=1 pnpm test:e2e`
Expected: everything passes. `content-safety` and `project-structure` cover every new file. The homepage shows five featured cards in order (`ntutbox`, `spine-ai`, `chippot`, `basketball-analysis`, `locmotion`). `/work` lists 13 projects with `asr-server` last.

Run: `pnpm build 2>&1 | grep -E "og/(zh|en)/work" | wc -l`
Expected: `26` (13 projects × 2 languages).

- [ ] **Step 9: Commit (local only; the repo is not public yet)**

```bash
git add src/content content-policy/denylist.json
git commit -m "content: draft zh/en copy for all projects, profile, experience and awards"
```

(Also add `public/resume-zh.pdf public/resume-en.pdf` to the `git add` line if the user supplied them.)

- [ ] **Step 10: User review gate**

Send the user a review list: each project's zh/en title and summary, the featured order, every `<Stat>` number with its source, and the cover strategy per project. Ask them to approve or edit. Apply their edits, re-run Step 8, and commit with `git commit -m "content: apply review edits"` (explicit `git add` paths as in Step 9). Don't start Task 16 until the user has approved the content.

---
### Task 15: Quality gates and CI (bundle/image budget, link check, Lighthouse CI, GitHub Actions)

**Files:**
- Create: `scripts/check-dist.mjs`, `tests/unit/check-dist.test.ts`, `lighthouserc.json`, `linkinator.config.json`, `.github/workflows/ci.yml`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: a built `dist/` (format `file`: `dist/zh.html`, `dist/en.html`, …); `pnpm preview:cf` on `127.0.0.1:8788` (Task 1); all unit and e2e suites.
- Produces:
  - `scripts/check-dist.mjs` exports `HOME_JS_BUDGET` (102400), `collectEntryScripts(html)`, `collectStaticImports(code, fromUrl)`, `jsClosure(distDir, entries)`, `inlineScripts(html)`, `homeJsBytes(distDir, htmlPath)`, `findImageViolations(html)`. Run directly, it exits 1 when homepage JS (zh and en) is ≥ 100 KB gzip, or when any `/_astro/` image is not inside a `<picture>` with AVIF + WebP `srcset` sources.
  - npm scripts `check:dist`, `check:links`, `lhci`.
  - CI workflow `CI` on pull requests and pushes to `main`.

- [ ] **Step 1: Write the failing unit tests**

`tests/unit/check-dist.test.ts`:

```ts
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
  it('accepts AVIF+WebP pictures in either attribute order', () => {
    expect(findImageViolations(good)).toEqual([]);
    expect(findImageViolations(astroOrder)).toEqual([]);
  });
  it('flags bare optimized images and pictures missing a format', () => {
    expect(findImageViolations('<img src="/_astro/x.png">')).toHaveLength(1);
    expect(findImageViolations('<picture><source type="image/webp" srcset="/_astro/a.webp 1x"><img src="/_astro/a.png"></picture>')).toHaveLength(1);
  });
  it('ignores non-optimized images such as the favicon', () => expect(findImageViolations('<img src="/favicon.svg">')).toEqual([]));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test tests/unit/check-dist.test.ts`
Expected: FAIL, `Failed to load url ../../scripts/check-dist.mjs`.

- [ ] **Step 3: Implement `scripts/check-dist.mjs`**

```js
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
    // Attribute order differs between Astro (srcset first) and React (type first), hence lookaheads.
    const hasAvif = /<source\b(?=[^>]*type="image\/avif")(?=[^>]*srcset=")[^>]*>/.test(picture);
    const hasWebp = /<source\b(?=[^>]*type="image\/webp")(?=[^>]*srcset=")[^>]*>/.test(picture);
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
```

Run: `pnpm test tests/unit/check-dist.test.ts`
Expected: PASS.

- [ ] **Step 4: Add scripts and tool configs**

Add to `package.json` `"scripts"`:

```json
    "check:dist": "node scripts/check-dist.mjs",
    "check:links": "linkinator http://127.0.0.1:8788/ --config linkinator.config.json",
    "lhci": "lhci autorun"
```

`linkinator.config.json` (crawl only the local site; external links are out of the build's control and flaky):

```json
{
  "recurse": true,
  "checkFragments": true,
  "concurrency": 20,
  "skip": ["^(?!http://127\\.0\\.0\\.1:8788)"],
  "verbosity": "error"
}
```

`lighthouserc.json`. Lighthouse's default form factor is mobile. `canonical` is skipped only because the audit runs on `127.0.0.1` while canonicals correctly point at `https://panspace.me`; `nav.spec.ts` asserts every canonical instead. Never lower a `minScore` to make CI pass.

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://127.0.0.1:8788/zh",
        "http://127.0.0.1:8788/en",
        "http://127.0.0.1:8788/zh/work",
        "http://127.0.0.1:8788/zh/work/ntutbox",
        "http://127.0.0.1:8788/en/about"
      ],
      "numberOfRuns": 3,
      "settings": { "skipAudits": ["canonical"], "chromeFlags": "--no-sandbox --headless=new" }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95, "aggregationMethod": "median-run" }],
        "categories:accessibility": ["error", { "minScore": 0.95, "aggregationMethod": "median-run" }],
        "categories:best-practices": ["error", { "minScore": 0.95, "aggregationMethod": "median-run" }],
        "categories:seo": ["error", { "minScore": 0.95, "aggregationMethod": "median-run" }]
      }
    },
    "upload": { "target": "filesystem", "outputDir": ".lighthouseci" }
  }
}
```

- [ ] **Step 5: Run every gate locally**

```bash
pnpm build && pnpm check:dist
pnpm preview:cf > "${TMPDIR:-/tmp}/wrangler.log" 2>&1 &
until curl -fsS http://127.0.0.1:8788/zh > /dev/null; do sleep 1; done
pnpm check:links
pnpm lhci
pkill -f "wrangler dev --port 8788"
```

Expected:
- `check:dist`: `ok   zh.html: homepage JS …KB gzip (budget 100 KB)`, the same for `en.html`, then `check-dist: all budgets met`. Expect roughly 80–90 KB, mostly React's client runtime from the palette island.
- `check:links`: ends with `Successfully scanned N links` and no `[404]`/`[0]` lines.
- `lhci`: `Done running autorun.`, and all assertions pass for every URL.

If a budget or score fails, fix the cause. Read the failing audit in `.lighthouseci/*.html`, or look at the largest file in the `check:dist` closure. Don't relax the threshold. If homepage JS is over budget, first check that the homepage doesn't import `motion` (only `/work` may), and that `src/lib/schemas.ts` (zod) isn't reachable from any client module.

- [ ] **Step 6: Write the CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      WRANGLER_SEND_METRICS: 'false'
      E2E_SKIP_BUILD: '1'
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version-file: .node-version
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test
      - run: pnpm build
      - run: pnpm check:dist
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - name: Start local Workers server
        run: |
          pnpm preview:cf > wrangler.log 2>&1 &
          for i in $(seq 1 60); do curl -fsS http://127.0.0.1:8788/zh > /dev/null && exit 0; sleep 1; done
          cat wrangler.log
          exit 1
      - run: pnpm check:links
      - run: pnpm lhci
      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: reports
          path: |
            playwright-report
            .lighthouseci
          retention-days: 14
```

Run: `pnpm exec playwright test --list > /dev/null && echo ok` (sanity check that the e2e suite still loads), and validate the YAML: `node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8')); console.log('yaml ok')"`
Expected: `ok` and `yaml ok`.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-dist.mjs tests/unit/check-dist.test.ts lighthouserc.json linkinator.config.json .github/workflows/ci.yml package.json
git commit -m "ci: enforce bundle, image, link and Lighthouse budgets on every PR"
```

---

### Task 16: Publish and deploy (MANUAL, outward-facing; each step needs user confirmation)

**Files:**
- Modify (Step 4 only): `wrangler.jsonc`

**Interfaces:**
- Consumes: the finished branch (Tasks 1–15), user-approved content (Task 14 Step 10), `wrangler.jsonc` `name: panspace-website`.
- Produces: public repo `poterpan/panspace-website`, Workers Builds deploying `main` with PR previews, `https://panspace.me` live, `www.panspace.me` and the `panspace.dev` apex 301-redirecting to it, and Web Analytics recording visits.

Every step marked **[GATED]** changes something visible to the outside world. Before it, show the user exactly what will happen and wait for an explicit "yes". If a step fails, stop and report. Don't improvise alternatives on production resources.

- [ ] **Step 1: Pre-publication audit (local, not gated)**

```bash
pnpm check && pnpm test && pnpm build && pnpm check:dist && pnpm test:e2e
git ls-files .superpowers | wc -l
git log -p --all -- . ':(exclude)pnpm-lock.yaml' > "${TMPDIR:-/tmp}/panspace-history.txt"
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { findDenylistHits, PHONE_RE } from './scripts/content-policy.mjs';
const text = readFileSync(process.argv[1], 'utf8');
const { entries } = JSON.parse(readFileSync('content-policy/denylist.json', 'utf8'));
const hits = findDenylistHits(text, entries).length;
const phone = PHONE_RE.test(text);
console.log('denylist hits:', hits, '| phone-like:', phone);
process.exit(hits || phone ? 1 : 0);
" "${TMPDIR:-/tmp}/panspace-history.txt"
```

Expected: all checks pass, `0` tracked files under `.superpowers`, and `denylist hits: 0 | phone-like: false`. Any hit in history means a sensitive term was committed at some point. Stop, tell the user, and rewrite history **before** the repo becomes public.

Also tell the user that `docs/superpowers/` (the spec and this plan) will be public, and confirm that's acceptable. If not, `git rm -r --cached docs/superpowers` and add it to `.gitignore` before Step 2.

- [ ] **Step 2: [GATED — requires user confirmation before executing] Create the public GitHub repo and push `main`**

Merge the feature branch into `main` first (superpowers:finishing-a-development-branch). Then:

```bash
gh repo create poterpan/panspace-website --public --description "Source of panspace.me" --source . --remote origin
git push -u origin main
gh repo view poterpan/panspace-website --json visibility -q .visibility
gh run watch --exit-status
```

Expected: `PUBLIC`, and the `CI` workflow run on `main` succeeds.

- [ ] **Step 3: [GATED — requires user confirmation before executing] Connect Cloudflare Workers Builds (first deploy)**

In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository → GitHub → `poterpan/panspace-website`**:
- Project name: `panspace-website` (must equal `name` in `wrangler.jsonc`)
- Production branch: `main`
- Build command: `pnpm build`
- Deploy command: `npx wrangler deploy`
- Builds for non-production branches: **enabled**, preview command `npx wrangler preview` (PR comments get a preview URL)
- Root directory: `/`

Save and deploy. Then, with `<account-subdomain>` being the workers.dev subdomain shown on the Worker's overview page:

```bash
curl -sI https://panspace-website.<account-subdomain>.workers.dev/zh | head -1     # HTTP/2 200
curl -sI https://panspace-website.<account-subdomain>.workers.dev/zh/ | grep -iE '^(HTTP|location)'   # 307 → /zh
curl -s -o /dev/null -w '%{http_code}\n' https://panspace-website.<account-subdomain>.workers.dev/nope  # 404
```

If the build log shows the wrong pnpm major or an `allowBuilds` error, set the build command to `npx -y pnpm@11.5.0 install --frozen-lockfile && npx -y pnpm@11.5.0 build` and retry.

- [ ] **Step 4: [GATED — requires user confirmation before executing] Attach the custom domain `panspace.me`**

Precondition: the apex `panspace.me` must have no DNS record that conflicts with a Worker custom domain (the dashboard reports conflicts; resolve them only with the user's consent).

On a branch, add to `wrangler.jsonc` (top level, after `"preview_urls": true,`):

```jsonc
  "routes": [{ "pattern": "panspace.me", "custom_domain": true }],
```

```bash
git add wrangler.jsonc
git commit -m "chore: serve the site on panspace.me"
```

Open a PR, wait for CI and the preview URL, merge. Workers Builds deploys and attaches the domain. Then:

```bash
curl -sI https://panspace.me/zh | head -1         # HTTP/2 200
curl -s https://panspace.me/ | grep -c 'hreflang="x-default"'   # 1
curl -s -o /dev/null -w '%{http_code}\n' https://panspace.me/en/work/nope   # 404
```

- [ ] **Step 5: [GATED — requires user confirmation before executing] Enable Cloudflare Web Analytics (cookieless)**

Dashboard → **Analytics & Logs → Web Analytics → Add a site** → hostname `panspace.me` → choose the **manual JS snippet** and copy the `token` value. If the zone offers automatic injection for this hostname, leave it **off**, otherwise the beacon loads twice. In the Worker's **Settings → Build → Variables and secrets**, add the build variable `PUBLIC_CF_BEACON_TOKEN = <token>` and retry the latest production build. Then:

```bash
curl -s https://panspace.me/zh | grep -c 'static.cloudflareinsights.com/beacon.min.js'   # 1
```

In a browser, open `https://panspace.me/zh`. DevTools → Application → Cookies should show nothing for `panspace.me`. Within a few minutes the visit appears in Web Analytics.

- [ ] **Step 6: [GATED — requires user confirmation before executing] Redirect `www.panspace.me` and the `panspace.dev` apex**

Record the current state first, so you can prove nothing else changed:

```bash
dig +short www.panspace.me; dig +short panspace.dev
curl -sI https://<an existing subdomain>.panspace.dev | head -1   # ask the user for one; note the status line
```

Zone **panspace.me**:
1. DNS: if `www` has no record, add `AAAA www 100::` (Proxied).
2. **Rules → Redirect Rules → Create rule** named `www → apex`. When incoming requests match the custom filter expression `(http.host eq "www.panspace.me")`, then URL redirect, **Dynamic**, expression `concat("https://panspace.me", http.request.uri.path)`, status **301**, **Preserve query string** on.

Zone **panspace.dev**:
1. DNS: if the apex `panspace.dev` has no record, add `AAAA @ 100::` (Proxied). **Don't touch any other record.** `*.panspace.dev` is the user's development playground and must keep working as before.
2. **Rules → Redirect Rules → Create rule** named `dev apex → panspace.me`. Expression `(http.host eq "panspace.dev")` (the apex only, never a wildcard), Dynamic `concat("https://panspace.me", http.request.uri.path)`, **301**, Preserve query string on.

Verify:

```bash
curl -sI "https://www.panspace.me/zh/work?x=1" | grep -iE '^(HTTP|location)'   # 301, location: https://panspace.me/zh/work?x=1
curl -sI "https://panspace.dev/en/about" | grep -iE '^(HTTP|location)'         # 301, location: https://panspace.me/en/about
curl -sI https://<the same existing subdomain>.panspace.dev | head -1            # identical to the status recorded above
```

- [ ] **Step 7: Production smoke test (not gated; read-only)**

```bash
rm -rf .lighthouseci
pnpm exec lhci collect --url=https://panspace.me/zh --url=https://panspace.me/en --url=https://panspace.me/zh/work/ntutbox --numberOfRuns=3
pnpm exec lhci assert --config=lighthouserc.json
```

Expected: all four categories ≥ 0.95 on production. Then open a throwaway PR from a new branch with any trivial change, confirm that Workers Builds comments a preview URL, close the PR without merging, and delete the branch.

---
## Spec coverage map

| Spec section | Task(s) |
|---|---|
| §1 purpose and success criteria (who/what/contact in 10 s; the site as a work; shareable project links) | 4, 5, 6, 8, 11, 12 |
| §2 decisions (Astro + React islands + Motion, View Transitions, repo content, Workers + Builds, public repo) | 1, 7, 8, 9, 11, 16 |
| §3 domains and redirects | 16 (gated) |
| §4 routes, root redirect, 404, résumé PDFs, out-of-scope list | 1, 4, 7, 9, 10, 13 |
| §5 content model, zod schemas, zh+en required, fixed sections, MDX components, confidential rules | 2, 7 |
| §6 content list, content rules, confirmed facts | 2 (seed + policy), 14 |
| §7 boot sequence, Bento layout per breakpoint, experience snippet, contact | 4, 5, 6 |
| §8 `/work` filters/sort/layout animation, project page anatomy, `/about` | 7, 9, 10 |
| §9 interaction matrix (desktop / touch / reduced motion), palette items, progressive enhancement | 5, 6, 8, 9, 11 |
| §10 colors, grid, fonts, OS elements | 3 |
| §11 performance budgets, a11y, SEO, analytics, tests, CI/deploy | 3, 11, 12, 13, 15, 16 |
| §12 deferred items (photo, résumé, screenshots) | 4, 10, 14 (all conditional on presence) |

**Interpretations made where the spec is silent or self-conflicting (flagged for the user):**
1. `/` "依 Accept-Language": the site is static, so the redirect runs client-side using `navigator.languages` (the same list the browser sends as Accept-Language). With JS off, visitors get two language links.
2. `meta.yaml` gains `coverAlt: {zh, en}`, needed for WCAG-compliant cover images.
3. "從其他頁導覽而來不播放 Boot" excludes the root `/` redirector. Otherwise first-time visitors arriving at `panspace.me/` would never see the boot.
4. "傾斜 ≤ 7°" is implemented as a 7° total span (±3.5°), matching the approved prototype.
5. Lighthouse CI skips only the `canonical` audit (local host ≠ canonical host). Playwright asserts canonicals instead.
6. TypeScript is pinned to 6.0.3, not 7.x, because `@astrojs/check@0.9.10` supports `^5 || ^6` only.
