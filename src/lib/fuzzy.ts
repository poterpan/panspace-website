const BOUNDARY = /[\s\-_/.·]/;

/** Subsequence match score (higher is better); null when not all query characters appear in order. */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (!q) return 0;
  const t = text.toLowerCase();
  let score = 0;
  let from = 0;
  let prev = -2;
  for (const ch of q) {
    const found = t.indexOf(ch, from);
    if (found === -1) return null;
    score += 1;
    if (found === prev + 1) score += 3;
    if (found === 0 || BOUNDARY.test(t[found - 1] ?? '')) score += 2;
    prev = found;
    from = found + ch.length;
  }
  if (t.replace(/\s+/g, '').startsWith(q)) score += 5;
  return score;
}

export function fuzzyFilter<T>(items: readonly T[], query: string, text: (item: T) => string): T[] {
  if (!query.trim()) return [...items];
  return items
    .map((item, index) => ({ item, index, score: fuzzyScore(query, text(item)) }))
    .filter((r): r is { item: T; index: number; score: number } => r.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}
