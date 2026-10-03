import { describe, expect, it } from 'vitest';
import { resumeHref } from '../../src/lib/resume';

describe('resumeHref', () => {
  it('returns the public URL only when the PDF exists', () => {
    const exists = (p: string) => p === 'public/resume-zh.pdf';
    expect(resumeHref('zh', exists)).toBe('/resume-zh.pdf');
    expect(resumeHref('en', exists)).toBeNull();
  });
});
