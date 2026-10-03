import { describe, expect, it } from 'vitest';
import { vtNames, vtStyle } from '../../src/lib/transitions';

describe('view-transition names', () => {
  it('derives three stable names per project', () => {
    expect(vtNames('spine-ai')).toEqual({ card: 'card-spine-ai', title: 'title-spine-ai', cover: 'cover-spine-ai' });
  });
  it('sanitizes characters that are not valid in a CSS ident', () => {
    expect(vtNames('Foo.Bar_1').card).toBe('card-foo-bar-1');
  });
  it('emits custom properties', () => {
    expect(vtStyle('chippot')).toBe('--vt-card:card-chippot;--vt-title:title-chippot;--vt-cover:cover-chippot');
  });
});
