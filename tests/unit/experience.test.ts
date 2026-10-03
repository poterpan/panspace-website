import { describe, expect, it } from 'vitest';
import { awardYearRange, recentExperience, sortAwards, sortByStartDesc } from '../../src/lib/experience';

describe('experience helpers', () => {
  const items = [
    { id: 'b', start: '2023-08' }, { id: 'a', start: '2024-08' }, { id: 'c', start: '2022-08' },
    { id: 'd', start: '2024-08' }, { id: 'e', start: '2021-01' }, { id: 'f', start: '2020-01' },
  ];
  it('sorts by start desc with id as tie-breaker', () => {
    expect(sortByStartDesc(items).map((i) => i.id)).toEqual(['a', 'd', 'b', 'c', 'e', 'f']);
  });
  it('returns the n most recent', () => {
    expect(recentExperience(items, 5).map((i) => i.id)).toEqual(['a', 'd', 'b', 'c', 'e']);
  });
});

describe('year-only dates', () => {
  it('sorts a year-only start after the months of the same year', () => {
    const mixed = [{ id: 'y', start: '2024' }, { id: 'm1', start: '2024-03' }, { id: 'm2', start: '2024-11' }, { id: 'p', start: '2025' }, { id: 'o', start: '2023-12' }];
    expect(sortByStartDesc(mixed).map((i) => i.id)).toEqual(['p', 'm2', 'm1', 'y', 'o']);
  });
});

describe('award helpers', () => {
  const awards = [{ id: 'x', year: 2022 }, { id: 'y', year: 2024 }, { id: 'a', year: 2024 }];
  it('sorts by year desc, then id', () => {
    expect(sortAwards(awards).map((a) => a.id)).toEqual(['a', 'y', 'x']);
  });
  it('computes the year range', () => {
    expect(awardYearRange(awards)).toEqual([2022, 2024]);
    expect(awardYearRange([])).toBeNull();
  });
});
