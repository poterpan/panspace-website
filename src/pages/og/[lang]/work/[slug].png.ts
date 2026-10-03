import type { APIRoute, GetStaticPaths } from 'astro';
import { getProjects, type ProjectEntry } from '../../../../lib/content';
import { LOCALES, type Locale } from '../../../../lib/i18n';
import { categoryLabel } from '../../../../i18n/ui';
import { renderOgPng } from '../../../../lib/og';

export const getStaticPaths = (async () => {
  const projects = await getProjects();
  return projects.flatMap((project) => LOCALES.map((lang) => ({ params: { lang, slug: project.slug }, props: { project } })));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, props }) => {
  const lang = params.lang as Locale;
  const { project } = props as { project: ProjectEntry };
  const text = project.text[lang].data;
  const png = await renderOgPng({
    eyebrow: `~/work/${project.slug}`,
    title: text.title,
    subtitle: text.summary,
    footer: ['panspace.me', ...project.meta.categories.map((c) => categoryLabel(lang, c))].join(' · '),
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
