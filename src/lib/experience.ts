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

type Notable = { year: number; id: string; kind: 'award' | 'paper'; rank?: { en: string } };
const PLACES = ['first', 'second', 'third'];
/** 1–3 for a placed win (read from the English rank), 9 for anything else: mentions, papers, unranked. */
function place(a: Notable): number {
  if (a.kind !== 'award' || !a.rank) return 9;
  const i = PLACES.findIndex((p) => new RegExp(`\\b${p}\\b`, 'i').test(a.rank!.en));
  return i === -1 ? 9 : i + 1;
}

/** The `limit` awards to headline: placed wins before everything else; newest first, then higher place. */
export function notableAwards<T extends Notable>(items: readonly T[], limit = 3): T[] {
  const newest = (a: T, b: T) => b.year - a.year || place(a) - place(b) || a.id.localeCompare(b.id);
  const wins = items.filter((a) => place(a) < 9).sort(newest);
  const rest = items.filter((a) => place(a) === 9).sort(newest);
  return [...wins, ...rest].slice(0, limit).sort(newest);
}
