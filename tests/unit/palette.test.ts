import { describe, expect, it } from 'vitest';
import { buildPaletteItems, type PaletteItemLabels } from '../../src/lib/palette';

const labels: PaletteItemLabels = {
  home: '首頁', work: '作品列表', about: '關於我', switchLang: '切換到 English', copyEmail: '複製 email',
  resume: '下載履歷', github: '開啟 GitHub', linkedin: '開啟 LinkedIn', action: '動作',
};
const base = {
  lang: 'zh' as const,
  labels,
  projects: [{ slug: 'ntutbox', title: 'NTUTBox 北科盒子', altTitle: 'NTUTBox' }],
  email: 'poter.pan@panspace.me',
  github: 'https://github.com/poterpan',
  resumeHref: null,
};

describe('buildPaletteItems', () => {
  it('lists pages, projects and actions with localized targets', () => {
    const items = buildPaletteItems(base);
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    expect(byId['page:home']?.action).toEqual({ type: 'navigate', href: '/zh' });
    expect(byId['page:work']?.action).toEqual({ type: 'navigate', href: '/zh/work' });
    expect(byId['page:about']?.action).toEqual({ type: 'navigate', href: '/zh/about' });
    expect(byId['project:ntutbox']?.action).toEqual({ type: 'navigate', href: '/zh/work/ntutbox' });
    expect(byId['project:ntutbox']?.keywords).toContain('NTUTBox');
    expect(byId['action:lang']?.action).toEqual({ type: 'switch-lang', target: 'en' });
    expect(byId['action:email']?.action).toEqual({ type: 'copy', text: 'poter.pan@panspace.me' });
    expect(byId['action:github']?.action).toEqual({ type: 'external', href: 'https://github.com/poterpan' });
    expect(byId['action:resume']).toBeUndefined();
    expect(byId['action:linkedin']).toBeUndefined();
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it('adds résumé and LinkedIn when available', () => {
    const items = buildPaletteItems({ ...base, resumeHref: '/resume-zh.pdf', linkedin: 'https://www.linkedin.com/in/x' });
    const ids = items.map((i) => i.id);
    expect(ids).toContain('action:resume');
    expect(ids).toContain('action:linkedin');
    expect(items.find((i) => i.id === 'action:resume')?.action).toEqual({ type: 'download', href: '/resume-zh.pdf' });
  });
});
