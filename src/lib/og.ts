import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export interface OgCard {
  eyebrow: string;
  title: string;
  subtitle: string;
  footer: string;
}

type FontDef = { name: string; data: Buffer; weight: 400 | 700; style: 'normal' };
type Node = { type: string; props: { style: Record<string, unknown>; children?: unknown } };

const FONT_ROOT = join(process.cwd(), 'node_modules', '@fontsource');
let fontsPromise: Promise<FontDef[]> | undefined;

async function loadFonts(): Promise<FontDef[]> {
  const file = (pkg: string, name: string) => readFile(join(FONT_ROOT, pkg, 'files', name));
  const tcDir = join(FONT_ROOT, 'noto-sans-tc', 'files');
  const tcFiles = (await readdir(tcDir)).filter((f) => /^noto-sans-tc-\d+-(400|700)-normal\.woff$/.test(f));
  const tc = await Promise.all(
    tcFiles.map(async (f): Promise<FontDef> => ({
      name: `Noto Sans TC ${f}`,
      data: await readFile(join(tcDir, f)),
      weight: f.includes('-700-') ? 700 : 400,
      style: 'normal',
    })),
  );
  return [
    { name: 'Geist', data: await file('geist', 'geist-latin-400-normal.woff'), weight: 400, style: 'normal' },
    { name: 'Geist', data: await file('geist', 'geist-latin-700-normal.woff'), weight: 700, style: 'normal' },
    { name: 'Geist Mono', data: await file('geist-mono', 'geist-mono-latin-400-normal.woff'), weight: 400, style: 'normal' },
    ...tc,
  ];
}

const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

export async function renderOgPng(card: OgCard): Promise<Uint8Array> {
  fontsPromise ??= loadFonts();
  const fonts = await fontsPromise;
  const tree = h(
    'div',
    {
      width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72,
      backgroundColor: '#07080a', color: '#e7e9ee', fontFamily: 'Geist',
      backgroundImage: 'linear-gradient(#ffffff0a 1px, transparent 1px), linear-gradient(90deg, #ffffff0a 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    },
    [
      h('div', { display: 'flex', fontFamily: 'Geist Mono', fontSize: 28, color: '#34d399' }, card.eyebrow),
      h('div', { display: 'flex', flexDirection: 'column' }, [
        h('div', { display: 'block', fontSize: 72, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, lineClamp: 2 }, card.title),
        h('div', { display: 'block', fontSize: 32, color: '#8a909c', lineHeight: 1.4, marginTop: 20, lineClamp: 2 }, card.subtitle),
      ]),
      h('div', { display: 'flex', alignItems: 'center', fontFamily: 'Geist Mono', fontSize: 24, color: '#8a909c' }, [
        h('div', { width: 14, height: 14, borderRadius: 7, backgroundColor: '#34d399', marginRight: 14 }),
        card.footer,
      ]),
    ],
  );
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], { width: 1200, height: 630, fonts });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
