import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Locale } from './i18n';

/** `/resume-<lang>.pdf` when `public/resume-<lang>.pdf` exists at build time, else null (entry hidden). */
export function resumeHref(
  lang: Locale,
  exists: (path: string) => boolean = existsSync,
  publicDir = 'public',
): string | null {
  const file = `resume-${lang}.pdf`;
  return exists(join(publicDir, file)) ? `/${file}` : null;
}
