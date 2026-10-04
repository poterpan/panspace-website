# Pan's Space

Personal portfolio site of Poter Pan, in Traditional Chinese and English: a Bento-style home page, a filterable project list with per-project case studies, an about/timeline page and a command palette.

## Stack

Astro (static output) with React islands, Motion, Tailwind CSS v4, MDX content collections validated by zod, deployed on Cloudflare Workers. Tested with Vitest and Playwright; Lighthouse CI and bundle/image budgets run on every PR.

## Scripts

```bash
pnpm install
pnpm dev          # local dev server
pnpm build        # static build into dist/
pnpm check        # astro check (types)
pnpm test         # unit tests, including content policy
pnpm test:e2e     # Playwright against the built site via Wrangler
pnpm check:dist   # homepage JS and AVIF/WebP budgets
pnpm check:links  # crawl a running preview (pnpm preview:cf)
pnpm lhci         # Lighthouse CI against a running preview
```

Set `E2E_PORT` to run the preview, e2e, link check and Lighthouse on a port other than 8788.

## Project covers and screenshots

Each project's `meta.yaml` picks a `coverStyle`: `image` (default, uses `cover` + `coverAlt`), `type` (big name + `coverTagline`), `schematic` (a drawing in `src/components/covers/schematic/<slug>.astro`) or `phones`.
To add app screenshots, put the files in `src/content/projects/<slug>/images/`, set `coverStyle: phones` with `screens: [./images/a.png, ./images/b.png]`, `coverTagline` and `coverAlt`, and show the full set in the MDX with `<PhoneStrip label="…" items={[{ src, alt, caption }]} />`.
Landscape web screenshots keep using `<Gallery>`.

## Content policy

Content is checked on every test run for a private denylist (kept out of the repo, supplied via the `CONTENT_DENYLIST` secret or a git-ignored local file), phone numbers, install counts and non-allow-listed repository links. See `content-policy/README.md`.

## License

Source code is MIT. Content and all images are all rights reserved. See `LICENSE`.
