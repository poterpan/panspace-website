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
