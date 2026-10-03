/**
 * Newest first. A year-only value ("2024") is the whole year, so it sorts after
 * every dated month of that year ("2024-08" before "2024"); ties fall back to id.
 */
export function sortByStartDesc<T extends { start: string; id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.start !== b.start ? (a.start < b.start ? 1 : -1) : a.id.localeCompare(b.id)));
}

export function recentExperience<T extends { start: string; id: string }>(items: readonly T[], n = 5): T[] {
  return sortByStartDesc(items).slice(0, n);
}

export function sortAwards<T extends { year: number; id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.year - a.year || a.id.localeCompare(b.id));
}

export function awardYearRange(items: readonly { year: number }[]): [number, number] | null {
  if (items.length === 0) return null;
  const years = items.map((i) => i.year);
  return [Math.min(...years), Math.max(...years)];
}
