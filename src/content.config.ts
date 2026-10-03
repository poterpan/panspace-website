import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import {
  awardSchema, experienceSchema, profileSchema, projectBodySchema, projectMetaSchema,
} from './lib/schemas';

const projectMeta = defineCollection({
  loader: glob({
    pattern: '*/meta.yaml',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.split('/')[0] as string,
  }),
  schema: ({ image }) => projectMetaSchema(image()),
});

const projectBody = defineCollection({
  loader: glob({ pattern: '*/{zh,en}.mdx', base: './src/content/projects' }),
  schema: projectBodySchema,
});

const profile = defineCollection({
  loader: glob({ pattern: 'profile.yaml', base: './src/content' }),
  schema: ({ image }) => profileSchema(image()),
});

const experience = defineCollection({ loader: file('src/content/experience.yaml'), schema: experienceSchema });
const awards = defineCollection({ loader: file('src/content/awards.yaml'), schema: awardSchema });

export const collections = { projectMeta, projectBody, profile, experience, awards };
