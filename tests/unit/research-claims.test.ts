import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// The master's research topic isn't public yet: the spine project is separate work, never the thesis.
const TOPIC = /醫學影像|medical[- ]imaging|脊椎|spine|x[- ]?ray/i;

describe('master\'s program copy', () => {
  it('the `now` panel names the program without a research topic', () => {
    const profile = parse(readFileSync('src/content/profile.yaml', 'utf8')) as { now: { value: { zh: string; en: string } }[] };
    for (const line of profile.now) expect(`${line.value.zh} ${line.value.en}`).not.toMatch(TOPIC);
  });
  it('the NTUT master\'s entry does not describe the research as spine or medical imaging', () => {
    const items = parse(readFileSync('src/content/experience.yaml', 'utf8')) as { id: string }[];
    const ms = items.find((i) => i.id === 'ntut-ms');
    expect(ms).toBeDefined();
    expect(JSON.stringify(ms)).not.toMatch(TOPIC);
  });
  it('the English program name is the official one (MPAI), not a made-up translation', () => {
    const text = readFileSync('src/content/profile.yaml', 'utf8') + readFileSync('src/content/experience.yaml', 'utf8');
    expect(text).toContain('Master Program in AI Technology (MPAI)');
    expect(text).not.toMatch(/Innovative AI/i);
  });
  it('the spine project is not framed as grad-school research', () => {
    for (const lang of ['zh', 'en']) {
      expect(readFileSync(`src/content/projects/spine-ai/${lang}.mdx`, 'utf8')).not.toMatch(/研究所|grad school|\bgraduate\b|\bmaster|碩士|thesis|論文|paper-ready/i);
    }
  });
});
