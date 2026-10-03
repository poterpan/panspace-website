import { describe, expect, it } from 'vitest';
import { categoryLabel, experienceTypeLabel, format, t, ui } from '../../src/i18n/ui';

describe('ui strings', () => {
  it('zh and en define exactly the same non-empty keys', () => {
    expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.zh).sort());
    for (const lang of ['zh', 'en'] as const) {
      for (const [key, value] of Object.entries(ui[lang])) expect(value, `${lang}.${key}`).not.toBe('');
    }
  });
  it('translates and formats', () => {
    expect(t('zh', 'nav.work')).toBe('作品');
    expect(t('en', 'nav.work')).toBe('Work');
    expect(format(t('en', 'work.count'), { n: 3 })).toBe('3 projects');
    expect(categoryLabel('zh', 'ai')).toBe('AI/CV');
    expect(experienceTypeLabel('en', 'teaching')).toBe('Teaching & community');
  });
});
