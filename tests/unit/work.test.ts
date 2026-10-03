import { describe, expect, it } from 'vitest';
import { parseCategoryParam } from '../../src/lib/work';

describe('parseCategoryParam', () => {
  it('accepts known categories', () => {
    expect(parseCategoryParam('ios')).toBe('ios');
    expect(parseCategoryParam('competition')).toBe('competition');
  });
  it('falls back to all for missing or unknown values', () => {
    expect(parseCategoryParam(null)).toBe('all');
    expect(parseCategoryParam('')).toBe('all');
    expect(parseCategoryParam('android')).toBe('all');
    expect(parseCategoryParam('IOS')).toBe('all');
  });
});
