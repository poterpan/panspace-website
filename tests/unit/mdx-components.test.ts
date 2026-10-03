import { describe, expect, it } from 'vitest';
import Stat from '../../src/components/mdx/Stat.astro';
import Diagram from '../../src/components/mdx/Diagram.astro';
import { renderAstro } from './helpers/render';

describe('MDX components', () => {
  it('Stat renders value, label and optional note', async () => {
    const html = await renderAstro(Stat, { value: '33k', label: 'course rows', note: 'per semester' });
    expect(html).toMatch(/<strong[^>]*>33k<\/strong>/);
    expect(html).toContain('course rows');
    expect(html).toContain('per semester');
  });
  it('Diagram renders slotted content and a caption', async () => {
    const html = await renderAstro(Diagram, { caption: 'Architecture' }, { default: '<svg data-test="d"></svg>' });
    expect(html).toContain('data-test="d"');
    expect(html).toMatch(/<figcaption[^>]*>Architecture<\/figcaption>/);
  });
});
