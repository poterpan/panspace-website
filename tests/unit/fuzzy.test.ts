import { describe, expect, it } from 'vitest';
import { fuzzyFilter, fuzzyScore } from '../../src/lib/fuzzy';

describe('fuzzyScore', () => {
  it('matches subsequences case-insensitively, including CJK', () => {
    expect(fuzzyScore('ntb', 'NTUTBox 北科盒子')).not.toBeNull();
    expect(fuzzyScore('北科', 'NTUTBox 北科盒子')).not.toBeNull();
    expect(fuzzyScore('CHIP', 'ChipPot')).not.toBeNull();
  });
  it('returns null when a character is missing and 0 for an empty query', () => {
    expect(fuzzyScore('xyz', 'ChipPot')).toBeNull();
    expect(fuzzyScore('  ', 'anything')).toBe(0);
  });
  it('prefers contiguous, prefix and word-start matches', () => {
    expect(fuzzyScore('spine', 'Spine X-ray AI')!).toBeGreaterThan(fuzzyScore('spine', 'some pointless innate example')!);
    expect(fuzzyScore('work', 'All work')!).toBeLessThan(fuzzyScore('work', 'work list')!);
  });
});

describe('fuzzyFilter', () => {
  const items = ['About', 'ChipPot', 'NTUTBox', 'Chinese'];
  it('keeps order for an empty query', () => expect(fuzzyFilter(items, '', (s) => s)).toEqual(items));
  it('filters and ranks', () => {
    expect(fuzzyFilter(items, 'chip', (s) => s)).toEqual(['ChipPot']);
    expect(fuzzyFilter(items, 'ch', (s) => s)).toEqual(['ChipPot', 'Chinese']);
  });
});
