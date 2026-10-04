import { describe, expect, it } from 'vitest';
import { notableAwards, recentExperience, sortAwards, sortByStartDesc } from '../../src/lib/experience';

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
});

describe('notableAwards', () => {
  const award = (id: string, year: number, kind: 'award' | 'paper', rank?: string) => ({
    id, year, kind, ...(rank ? { rank: { zh: rank, en: rank } } : {}),
  });
  const items = [
    award('mention-2024', 2024, 'award', 'Honorable mention'),
    award('paper-2024', 2024, 'paper'),
    award('third-2024', 2024, 'award', 'Third prize'),
    award('second-2023', 2023, 'award', 'Second prize'),
    award('third-2023', 2023, 'award', 'Third place'),
    award('second-2022', 2022, 'award', 'Second prize'),
  ];
  it('prefers placed competition wins over mentions and papers, most recent first', () => {
    expect(notableAwards(items, 3).map((a) => a.id)).toEqual(['third-2024', 'second-2023', 'third-2023']);
  });
  it('within a year, a higher place wins the slot', () => {
    const year = [award('a-third', 2023, 'award', 'Third place'), award('b-second', 2023, 'award', 'Second prize, Taiwan final'), award('c-second', 2023, 'award', 'Second prize')];
    expect(notableAwards(year, 2).map((a) => a.id)).toEqual(['b-second', 'c-second']);
  });
  it('fills with the rest when there are too few wins, still newest first', () => {
    const few = [items[0]!, items[1]!, items[3]!];
    expect(notableAwards(few, 3).map((a) => a.id)).toEqual(['mention-2024', 'paper-2024', 'second-2023']);
  });
});
