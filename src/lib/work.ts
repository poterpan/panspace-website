import { CATEGORIES, type Category } from './taxonomy';

export type WorkFilterKey = Category | 'all';

export interface WorkFilter {
  key: WorkFilterKey;
  label: string;
}

export interface WorkCardData {
  slug: string;
  href: string;
  title: string;
  summary: string;
  categories: Category[];
  categoryLabels: string[];
  period: string;
  /** The project's <Cover>, pre-rendered by Astro (see WorkCovers.astro). */
  coverHtml: string;
}

export function parseCategoryParam(value: string | null): WorkFilterKey {
  return value && (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : 'all';
}
