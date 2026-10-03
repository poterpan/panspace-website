import type { APIRoute, GetStaticPaths } from 'astro';
import { getProfile } from '../../../lib/content';
import { langPaths, type Locale } from '../../../lib/i18n';
import { renderOgPng } from '../../../lib/og';

export const getStaticPaths = (() => langPaths()) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as Locale;
  const profile = await getProfile();
  const png = await renderOgPng({ eyebrow: '~/panspace', title: profile.name[lang], subtitle: profile.tagline[lang], footer: 'panspace.me' });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
