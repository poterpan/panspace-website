import type { Locale } from './i18n';

const ident = (slug: string) => slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

/** One shared name per project: the card box morphs into the project's window frame and back. */
export function vtNames(slug: string): { card: string } {
  return { card: `card-${ident(slug)}` };
}

export function vtStyle(slug: string): string {
  return `--vt-card:${vtNames(slug).card}`;
}

/**
 * Where the window's close button leads. A window opened from the home Bento or the work list
 * closes back into that page (via history, so the morph reverses); anything else lands on the work list.
 */
export function closeTarget(lang: Locale, from: string | null): { href: string; back: boolean } {
  const path = from?.replace(/\/+$/, '') ?? '';
  if (path === `/${lang}` || path === `/${lang}/work`) return { href: path, back: true };
  return { href: `/${lang}/work`, back: false };
}
