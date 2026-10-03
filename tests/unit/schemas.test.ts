import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import {
  awardSchema, experienceSchema, profileSchema, projectBodySchema, projectMetaSchema,
} from '../../src/lib/schemas';

const meta = projectMetaSchema(z.string());
const validMeta = {
  date: '2023-09',
  end: 'present',
  categories: ['ios', 'web'],
  stack: ['Swift'],
  role: { zh: '獨立開發', en: 'Solo developer' },
  links: { website: 'https://ntutbox.com' },
  featured: 1,
  bento: 'wide',
  cover: './images/cover.png',
  coverAlt: { zh: '封面', en: 'Cover' },
};

describe('projectMetaSchema', () => {
  it('accepts a complete meta and fills defaults', () => {
    const parsed = meta.parse({ ...validMeta, bento: undefined });
    expect(parsed.bento).toBe('regular');
    expect(parsed.confidential).toBe(false);
  });
  it('defaults links to an empty object', () => {
    expect(meta.parse({ ...validMeta, links: undefined }).links).toEqual({});
  });
  it.each([
    ['bad month', { date: '2023-13' }],
    ['bad end', { end: '2023/10' }],
    ['end before date', { end: '2023-01' }],
    ['unknown category', { categories: ['android'] }],
    ['empty categories', { categories: [] }],
    ['missing en role', { role: { zh: '獨立開發' } }],
    ['missing coverAlt', { coverAlt: undefined }],
    ['non-url link', { links: { website: 'ntutbox.com' } }],
    ['unknown key', { client: 'x' }],
    ['confidential with github', { confidential: true, links: { github: 'https://github.com/poterpan/x' } }],
  ])('rejects %s', (_name, patch) => {
    expect(meta.safeParse({ ...validMeta, ...patch }).success).toBe(false);
  });
});

describe('projectBodySchema', () => {
  it('requires a title and summary', () => {
    expect(projectBodySchema.safeParse({ title: 'T', summary: 'S' }).success).toBe(true);
    expect(projectBodySchema.safeParse({ title: 'T' }).success).toBe(false);
    expect(projectBodySchema.safeParse({ title: '', summary: 'S' }).success).toBe(false);
  });
});

describe('profileSchema', () => {
  const profile = profileSchema(z.string());
  const valid = {
    name: { zh: 'Poter Pan', en: 'Poter Pan' },
    tagline: { zh: 'a', en: 'b' },
    bio: { zh: 'a', en: 'b' },
    location: { zh: '台北', en: 'Taipei' },
    email: 'poter.pan@panspace.me',
    freelance: 'open',
    socials: { github: 'https://github.com/poterpan' },
    skills: [{ group: { zh: 'iOS', en: 'iOS' }, items: ['Swift'] }],
  };
  it('accepts a profile without linkedin or photo', () => {
    expect(profile.safeParse(valid).success).toBe(true);
  });
  it('rejects a bad email and an unknown freelance status', () => {
    expect(profile.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
    expect(profile.safeParse({ ...valid, freelance: 'maybe' }).success).toBe(false);
  });
});

describe('experienceSchema / awardSchema', () => {
  it('validates the experience type enum and dates', () => {
    const base = {
      id: 'ios-club-7', type: 'teaching', start: '2023-08', end: '2024-07',
      title: { zh: '社長', en: 'President' }, org: { zh: 'iOS Club', en: 'iOS Club' },
      description: { zh: 'a', en: 'b' },
    };
    expect(experienceSchema.safeParse(base).success).toBe(true);
    expect(experienceSchema.safeParse({ ...base, type: 'hobby' }).success).toBe(false);
    expect(experienceSchema.safeParse({ ...base, start: '2023-8' }).success).toBe(false);
  });
  it('validates awards', () => {
    const award = { id: 'a1', year: 2023, kind: 'award', name: { zh: '獎', en: 'Prize' } };
    expect(awardSchema.safeParse(award).success).toBe(true);
    expect(awardSchema.safeParse({ ...award, kind: 'medal' }).success).toBe(false);
  });
});
