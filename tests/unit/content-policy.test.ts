import { describe, expect, it } from 'vitest';
import {
  PHONE_RE, WEAK_METRIC_RE, findDenylistHits, findDisallowedRepoLinks, hashTerm, loadDenylist, normalize,
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

describe('loadDenylist', () => {
  const none = () => false;
  it('prefers the env var (newline-separated terms)', () => {
    const r = loadDenylist({ env: { CONTENT_DENYLIST: 'acme corp\n\nfoo' }, exists: none });
    expect(r?.source).toBe('env');
    expect(r?.entries).toEqual([hashTerm('acme corp'), hashTerm('foo')]);
  });
  it('accepts JSON in the env var', () => {
    const entries = [hashTerm('x')];
    expect(loadDenylist({ env: { CONTENT_DENYLIST: JSON.stringify({ entries }) }, exists: none })?.entries).toEqual(entries);
  });
  it('falls back to the local file, then null', () => {
    const entries = [hashTerm('y')];
    const r = loadDenylist({ env: {}, exists: () => true, read: () => JSON.stringify({ entries }) });
    expect(r).toEqual({ entries, source: 'file' });
    expect(loadDenylist({ env: {}, exists: none })).toBeNull();
  });
});
