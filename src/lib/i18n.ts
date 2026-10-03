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
