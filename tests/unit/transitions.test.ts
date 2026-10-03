import { describe, expect, it } from 'vitest';
import { closeTarget, vtNames, vtStyle } from '../../src/lib/transitions';

describe('view-transition names', () => {
  it('derives one window name per project, shared by the card and the window frame', () => {
    expect(vtNames('spine-ai')).toEqual({ card: 'card-spine-ai' });
  });
  it('sanitizes characters that are not valid in a CSS ident', () => {
    expect(vtNames('Foo.Bar_1').card).toBe('card-foo-bar-1');
  });
  it('emits the custom property', () => {
    expect(vtStyle('chippot')).toBe('--vt-card:card-chippot');
  });
});

describe('window close target', () => {
  it('goes back to the home page or the work list it was opened from', () => {
    expect(closeTarget('zh', '/zh')).toEqual({ href: '/zh', back: true });
    expect(closeTarget('zh', '/zh/')).toEqual({ href: '/zh', back: true });
    expect(closeTarget('en', '/en/work')).toEqual({ href: '/en/work', back: true });
  });
  it('falls back to the work list for any other origin', () => {
    expect(closeTarget('zh', null)).toEqual({ href: '/zh/work', back: false });
    expect(closeTarget('zh', '/zh/about')).toEqual({ href: '/zh/work', back: false });
    expect(closeTarget('zh', '/zh/work/chippot')).toEqual({ href: '/zh/work', back: false });
    expect(closeTarget('zh', '/en/work')).toEqual({ href: '/zh/work', back: false });
  });
});
