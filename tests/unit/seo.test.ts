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
