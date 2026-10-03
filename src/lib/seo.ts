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
