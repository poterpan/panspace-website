import { describe, expect, it } from 'vitest';
import Stat from '../../src/components/mdx/Stat.astro';
import Diagram from '../../src/components/mdx/Diagram.astro';
import PhoneStrip from '../../src/components/mdx/PhoneStrip.astro';
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
  it('PhoneStrip frames each screenshot unless framed is false', async () => {
    const shot = { src: { src: '/s.png', width: 600, height: 1299, format: 'png' }, alt: 'Today', caption: 'Today view' };
    const framed = await renderAstro(PhoneStrip, { label: 'Shots', items: [shot, shot] });
    expect(framed.match(/class="phone-frame"/g)).toHaveLength(2);
    expect(framed).toMatch(/role="region" aria-label="Shots" tabindex="0"/);
    expect(framed).toContain('<figcaption>Today view</figcaption>');
    const bare = await renderAstro(PhoneStrip, { label: 'Shots', items: [shot], framed: false });
    expect(bare).toContain('class="phone-bare"');
    expect(bare).not.toContain('phone-frame');
  });
});
