import { LOCALES, type Locale, type Localized } from './i18n';
import type { Category } from './taxonomy';

export interface ProjectLinks {
  appStore?: string;
  website?: string;
  github?: string;
  demo?: string;
}
export type LinkKind = 'appStore' | 'website' | 'demo' | 'github';

export interface ProjectMetaData<C> {
  date: string;
  end?: string;
  categories: Category[];
  stack: string[];
  role: Localized;
  links: ProjectLinks;
  featured?: number;
  bento: 'wide' | 'regular';
  cover: C;
  coverAlt: Localized;
  confidential: boolean;
  listOrder?: number;
}

export interface BodyLike {
  id: string;
  data: { title: string; summary: string };
}

export interface Project<C, B extends BodyLike> {
  slug: string;
  meta: ProjectMetaData<C>;
  text: Record<Locale, B>;
}

type Sortable = { slug: string; meta: { featured?: number; date: string; listOrder?: number } };

export class MissingTranslationError extends Error {
  readonly slug: string;
  readonly lang: Locale;
  constructor(slug: string, lang: Locale) {
    super(`Project "${slug}" is missing ${lang}.mdx (both zh.mdx and en.mdx are required).`);
    this.name = 'MissingTranslationError';
    this.slug = slug;
    this.lang = lang;
  }
}

export function assembleProjects<C, B extends BodyLike>(
  metas: { id: string; data: ProjectMetaData<C> }[],
  bodies: B[],
): Project<C, B>[] {
  const slugs = new Set(metas.map((m) => m.id));
  for (const b of bodies) {
    const slug = b.id.split('/')[0] ?? '';
    if (!slugs.has(slug)) throw new Error(`Found ${b.id}.mdx without a matching ${slug}/meta.yaml`);
  }
  const byId = new Map(bodies.map((b) => [b.id, b]));
  const projects = metas.map((m) => {
    const text = {} as Record<Locale, B>;
    for (const lang of LOCALES) {
      const found = byId.get(`${m.id}/${lang}`);
      if (!found) throw new MissingTranslationError(m.id, lang);
      text[lang] = found;
    }
    return { slug: m.id, meta: m.data, text };
  });
  return sortForList(projects);
}

/** Featured (by `featured` asc) → the rest by date desc → `listOrder` items last (by `listOrder` asc). */
export function sortForList<P extends Sortable>(items: readonly P[]): P[] {
  const rank = (p: P) => (p.meta.listOrder !== undefined ? 2 : p.meta.featured !== undefined ? 0 : 1);
  return [...items].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0 && a.meta.featured !== b.meta.featured) return (a.meta.featured ?? 0) - (b.meta.featured ?? 0);
    if (ra === 2 && a.meta.listOrder !== b.meta.listOrder) return (a.meta.listOrder ?? 0) - (b.meta.listOrder ?? 0);
    if (a.meta.date !== b.meta.date) return a.meta.date < b.meta.date ? 1 : -1;
    return a.slug.localeCompare(b.slug);
  });
}

export function featuredForHome<P extends Sortable>(items: readonly P[], limit = 5): P[] {
  return sortForList(items.filter((p) => p.meta.featured !== undefined && p.meta.listOrder === undefined)).slice(0, limit);
}

export function neighbors<P extends { slug: string }>(ordered: readonly P[], slug: string): { prev: P | null; next: P | null } {
  const i = ordered.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return { prev: ordered[i - 1] ?? null, next: ordered[i + 1] ?? null };
}

const LINK_ORDER: LinkKind[] = ['appStore', 'website', 'demo', 'github'];

export function visibleLinks(meta: { links: ProjectLinks; confidential: boolean }): { kind: LinkKind; href: string }[] {
  return LINK_ORDER.flatMap((kind) => {
    const href = meta.links[kind];
    if (!href || (kind === 'github' && meta.confidential)) return [];
    return [{ kind, href }];
  });
}

export function filterByCategory<T extends { categories: readonly Category[] }>(items: T[], key: Category | 'all'): T[] {
  return key === 'all' ? items : items.filter((i) => i.categories.includes(key));
}
