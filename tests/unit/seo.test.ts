import { describe, expect, it } from 'vitest';
import { SITE, alternateLinks, canonicalUrl, jsonLdScript, ogImageUrl, personJsonLd, projectJsonLd } from '../../src/lib/seo';

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
