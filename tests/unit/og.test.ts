import { describe, expect, it } from 'vitest';
import { renderOgPng } from '../../src/lib/og';

describe('renderOgPng', () => {
  it('renders a 1200×630 PNG with mixed CJK/Latin text', async () => {
    const png = await renderOgPng({
      eyebrow: '~/work/ntutbox',
      title: 'NTUTBox 北科盒子',
      subtitle: '已上架 App Store 的北科課表 App。',
      footer: 'panspace.me · iOS · Web',
    });
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(view.getUint32(16)).toBe(1200);
    expect(view.getUint32(20)).toBe(630);
  }, 120_000);
});
