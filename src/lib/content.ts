import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { sortAwards, sortByStartDesc } from './experience';
import { assembleProjects, type Project } from './projects';

export type ProjectBodyEntry = CollectionEntry<'projectBody'>;
export type ProjectEntry = Project<ImageMetadata, ProjectBodyEntry>;
export type Profile = CollectionEntry<'profile'>['data'];
export type Experience = CollectionEntry<'experience'>['data'];
export type Award = CollectionEntry<'awards'>['data'];

/** All projects in list order. Throws MissingTranslationError, which fails the build, if zh/en is missing. */
export async function getProjects(): Promise<ProjectEntry[]> {
  const [metas, bodies] = await Promise.all([getCollection('projectMeta'), getCollection('projectBody')]);
  return assembleProjects(metas, bodies);
}

export async function getProfile(): Promise<Profile> {
  const [entry] = await getCollection('profile');
  if (!entry) throw new Error('src/content/profile.yaml is missing');
  return entry.data;
}

export async function getExperience(): Promise<Experience[]> {
  return sortByStartDesc((await getCollection('experience')).map((e) => e.data));
}

export async function getAwards(): Promise<Award[]> {
  return sortAwards((await getCollection('awards')).map((e) => e.data));
}
