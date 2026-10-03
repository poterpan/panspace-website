import { experimental_AstroContainer as AstroContainer } from 'astro/container';

type Component = Parameters<AstroContainer['renderToString']>[0];

/** Renders an .astro component to HTML without dev-only source attributes. */
export async function renderAstro(component: Component, props: Record<string, unknown> = {}, slots?: Record<string, string>): Promise<string> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(component, { props, slots });
  return html.replace(/\s?data-astro-source-(?:file|loc)="[^"]*"/g, '');
}
