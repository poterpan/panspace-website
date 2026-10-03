import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { featuredForHome, sortForList } from '../../src/lib/projects';

export interface MetaLite {
  slug: string;
  meta: { date: string; featured?: number; listOrder?: number; categories: string[]; confidential?: boolean };
}

export function projectMetas(): MetaLite[] {
  const root = 'src/content/projects';
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(`${root}/${d.name}/meta.yaml`))
    .map((d) => ({ slug: d.name, meta: parse(readFileSync(`${root}/${d.name}/meta.yaml`, 'utf8')) as MetaLite['meta'] }));
}

export const orderedSlugs = (): string[] => sortForList(projectMetas()).map((p) => p.slug);
export const featuredSlugs = (): string[] => featuredForHome(projectMetas()).map((p) => p.slug);

/** Language-less paths that exist. Later tasks add '/work' and '/about'. */
export const STATIC_PATHS = ['/'];
export function allPaths(): string[] {
  return [...STATIC_PATHS, ...orderedSlugs().map((s) => `/work/${s}`)];
}
