import { z } from 'astro/zod';
import { CATEGORIES, EXPERIENCE_TYPES } from './taxonomy';

export { CATEGORIES, EXPERIENCE_TYPES, type Category, type ExperienceType } from './taxonomy';

export const ym = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');
const end = z.union([ym, z.literal('present')]);
export const localized = z.object({ zh: z.string().min(1), en: z.string().min(1) }).strict();

export function projectMetaSchema<C extends z.ZodType>(cover: C) {
  return z
    .object({
      date: ym,
      end: end.optional(),
      categories: z.array(z.enum(CATEGORIES)).min(1),
      stack: z.array(z.string().min(1)).min(1),
      role: localized,
      links: z
        .object({
          appStore: z.url().optional(),
          website: z.url().optional(),
          github: z.url().optional(),
          demo: z.url().optional(),
        })
        .strict()
        .default({}),
      featured: z.number().int().positive().optional(),
      bento: z.enum(['wide', 'regular']).default('regular'),
      cover,
      coverAlt: localized,
      confidential: z.boolean().default(false),
      listOrder: z.number().int().optional(),
    })
    .strict()
    .refine((m) => !m.end || m.end === 'present' || m.end >= m.date, {
      message: 'end must not be before date',
      path: ['end'],
    })
    .refine((m) => !(m.confidential && m.links.github), {
      message: 'confidential projects must not set links.github',
      path: ['links', 'github'],
    });
}

export const projectBodySchema = z
  .object({ title: z.string().min(1), summary: z.string().min(1).max(220) })
  .strict();

export function profileSchema<C extends z.ZodType>(photo: C) {
  return z
    .object({
      name: localized,
      tagline: localized,
      bio: localized,
      location: localized,
      email: z.email(),
      freelance: z.enum(['open', 'busy']),
      socials: z.object({ github: z.url(), linkedin: z.url().optional() }).strict(),
      skills: z
        .array(z.object({ group: localized, items: z.array(z.string().min(1)).min(1) }).strict())
        .min(1),
      photo: photo.optional(),
    })
    .strict();
}

export const experienceSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(EXPERIENCE_TYPES),
    start: ym,
    end: end.optional(),
    title: localized,
    org: localized,
    description: localized,
  })
  .strict();

export const awardSchema = z
  .object({
    id: z.string().min(1),
    year: z.number().int().min(2000).max(2100),
    kind: z.enum(['award', 'paper']),
    name: localized,
    rank: localized.optional(),
    org: localized.optional(),
  })
  .strict();
