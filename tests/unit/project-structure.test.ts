import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SECTIONS = {
  zh: ['背景與問題', '我的角色', '做法與技術決策', '成果', '學到什麼'],
  en: ['Background & problem', 'My role', 'Approach & technical decisions', 'Outcome', 'What I learned'],
} as const;
const root = 'src/content/projects';
const slugs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

describe('project MDX structure', () => {
  for (const slug of slugs) {
    for (const lang of ['zh', 'en'] as const) {
      it(`${slug}/${lang}.mdx exists and uses the fixed sections in order`, () => {
        const file = `${root}/${slug}/${lang}.mdx`;
        expect(existsSync(file)).toBe(true);
        const headings = [...readFileSync(file, 'utf8').matchAll(/^## (.+)$/gm)].map((m) => m[1]?.trim());
        expect(headings).toEqual(SECTIONS[lang]);
      });
    }
  }
});
