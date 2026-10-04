import { z } from 'astro/zod';
import { CATEGORIES, EXPERIENCE_TYPES } from './taxonomy';
import { COVER_STYLES, TINT_NAMES } from './covers';

export { CATEGORIES, EXPERIENCE_TYPES, type Category, type ExperienceType } from './taxonomy';

export const ym = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'expected YYYY-MM or YYYY');
const end = z.union([ym, z.literal('present')]);

/** An end date is valid when it is not before the start; a year-only value compares by year alone. */
export function endNotBefore(start: string, endValue: string | undefined): boolean {
  if (!endValue || endValue === 'present') return true;
  if (start.length === 4 || endValue.length === 4) return endValue.slice(0, 4) >= start.slice(0, 4);
  return endValue >= start;
}
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
      coverStyle: z.enum(COVER_STYLES).default('image'),
      cover: cover.optional(),
      coverAlt: localized.optional(),
      coverTagline: localized.optional(),
      coverTitle: localized.optional(),
      coverTint: z.enum(TINT_NAMES).optional(),
      // One list for both languages, or a list per language for shots taken in each UI language.
      screens: z
        .union([
          z.array(cover).min(1).max(2),
          z.object({ zh: z.array(cover).min(1).max(2), en: z.array(cover).min(1).max(2) }).strict(),
        ])
        .optional(),
      coverFramed: z.boolean().optional(),
      confidential: z.boolean().default(false),
      listOrder: z.number().int().optional(),
    })
    .strict()
    .superRefine((m, ctx) => {
      const need = (key: keyof typeof m, why: string) => {
        if (m[key] === undefined) ctx.addIssue({ code: 'custom', message: `${String(key)} is required ${why}`, path: [key] });
      };
      const forbid = (key: keyof typeof m, why: string) => {
        if (m[key] !== undefined) ctx.addIssue({ code: 'custom', message: `${String(key)} is not used ${why}`, path: [key] });
      };
      const style = `for coverStyle: ${m.coverStyle}`;
      if (m.coverStyle === 'image') {
        need('cover', style);
        need('coverAlt', style);
      } else {
        forbid('cover', style);
        need('coverTagline', style);
      }
      // phones: two portrait app shots; browser: one landscape web shot.
      const shots = m.coverStyle === 'phones' ? 2 : m.coverStyle === 'browser' ? 1 : 0;
      if (shots) {
        need('screens', style);
        need('coverAlt', style);
        const lists = !m.screens ? [] : Array.isArray(m.screens) ? [m.screens] : [m.screens.zh, m.screens.en];
        if (lists.some((list) => list.length !== shots)) {
          ctx.addIssue({ code: 'custom', message: `screens needs exactly ${shots} image(s) ${style}`, path: ['screens'] });
        }
      } else {
        forbid('screens', style);
      }
      if (m.coverStyle !== 'phones') forbid('coverFramed', style);
    })
    .refine((m) => endNotBefore(m.date, m.end), {
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
      /** The homepage `$ now` panel: what I'm doing right now, one label/value line each. */
      now: z.array(z.object({ label: localized, value: localized }).strict()).min(1).max(5).optional(),
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
    project: z.string().min(1).optional(),
  })
  .strict()
  .refine((e) => endNotBefore(e.start, e.end), { message: 'end must not be before start', path: ['end'] });

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
