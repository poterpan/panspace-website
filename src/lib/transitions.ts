const ident = (slug: string) => slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

export function vtNames(slug: string): { card: string; title: string; cover: string } {
  const id = ident(slug);
  return { card: `card-${id}`, title: `title-${id}`, cover: `cover-${id}` };
}

export function vtStyle(slug: string): string {
  const n = vtNames(slug);
  return `--vt-card:${n.card};--vt-title:${n.title};--vt-cover:${n.cover}`;
}
