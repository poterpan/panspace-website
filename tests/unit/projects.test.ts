import { describe, expect, it } from 'vitest';
import {
  MissingTranslationError, assembleProjects, featuredForHome, filterByCategory, neighbors,
  sortForList, visibleLinks, type ProjectMetaData,
} from '../../src/lib/projects';

function meta(patch: Partial<ProjectMetaData<string>> = {}): ProjectMetaData<string> {
  return {
    date: '2024-01', categories: ['web'], stack: ['TS'], role: { zh: '開發', en: 'Dev' },
    links: {}, bento: 'regular', coverStyle: 'image', cover: 'c.png', coverAlt: { zh: 'a', en: 'a' },
    confidential: false, ...patch,
  };
}
const body = (id: string) => ({ id, data: { title: id, summary: id } });

describe('assembleProjects', () => {
  it('pairs zh and en bodies with their meta', () => {
    const [p] = assembleProjects([{ id: 'a', data: meta() }], [body('a/zh'), body('a/en')]);
    expect(p?.slug).toBe('a');
    expect(p?.text.zh.id).toBe('a/zh');
    expect(p?.text.en.id).toBe('a/en');
  });
  it('throws MissingTranslationError naming the slug and language', () => {
    const run = () => assembleProjects([{ id: 'a', data: meta() }], [body('a/zh')]);
    expect(run).toThrow(MissingTranslationError);
    expect(run).toThrow('Project "a" is missing en.mdx');
  });
  it('throws for a body without meta', () => {
    expect(() => assembleProjects([], [body('ghost/zh')])).toThrow('ghost/zh.mdx without a matching ghost/meta.yaml');
  });
});

describe('sortForList', () => {
  const items = [
    { slug: 'old', meta: meta({ date: '2021-01' }) },
    { slug: 'tail-2', meta: meta({ date: '2025-01', listOrder: 2 }) },
    { slug: 'feat-2', meta: meta({ date: '2020-01', featured: 2 }) },
    { slug: 'new', meta: meta({ date: '2024-05' }) },
    { slug: 'tail-1', meta: meta({ date: '2019-01', listOrder: 1 }) },
    { slug: 'feat-1', meta: meta({ date: '2019-01', featured: 1 }) },
  ];
  it('orders featured, then by date desc, then listOrder items last', () => {
    expect(sortForList(items).map((p) => p.slug)).toEqual(['feat-1', 'feat-2', 'new', 'old', 'tail-1', 'tail-2']);
  });
  it('does not mutate its input', () => {
    const copy = [...items];
    sortForList(items);
    expect(items).toEqual(copy);
  });
  it('featuredForHome keeps featured only, in order, capped', () => {
    expect(featuredForHome(items).map((p) => p.slug)).toEqual(['feat-1', 'feat-2']);
    expect(featuredForHome(items, 1).map((p) => p.slug)).toEqual(['feat-1']);
  });
});

describe('neighbors', () => {
  const list = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];
  it('returns prev and next', () => {
    expect(neighbors(list, 'b')).toEqual({ prev: { slug: 'a' }, next: { slug: 'c' } });
    expect(neighbors(list, 'a')).toEqual({ prev: null, next: { slug: 'b' } });
    expect(neighbors(list, 'c')).toEqual({ prev: { slug: 'b' }, next: null });
    expect(neighbors(list, 'zzz')).toEqual({ prev: null, next: null });
  });
});

describe('visibleLinks', () => {
  const links = { github: 'https://github.com/poterpan/x', website: 'https://x.dev', appStore: 'https://apps.apple.com/x' };
  it('orders links and hides github for confidential projects', () => {
    expect(visibleLinks({ links, confidential: false }).map((l) => l.kind)).toEqual(['appStore', 'website', 'github']);
    expect(visibleLinks({ links, confidential: true }).map((l) => l.kind)).toEqual(['appStore', 'website']);
  });
});

describe('filterByCategory', () => {
  const items = [{ categories: ['ios', 'web'] as const }, { categories: ['ai'] as const }];
  it('filters by category and passes everything for all', () => {
    expect(filterByCategory([...items], 'ios')).toHaveLength(1);
    expect(filterByCategory([...items], 'all')).toHaveLength(2);
    expect(filterByCategory([...items], 'competition')).toHaveLength(0);
  });
});
