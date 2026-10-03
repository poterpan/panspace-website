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
