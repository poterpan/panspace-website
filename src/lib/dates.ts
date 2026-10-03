import type { Locale } from './i18n';

const PRESENT: Record<Locale, string> = { zh: '現在', en: 'Present' };

export function formatYm(ym: string): string {
  return ym.replace('-', '.');
}

export function formatPeriod(start: string, end: string | undefined, lang: Locale): string {
  const from = formatYm(start);
  if (!end) return from;
  const to = end === 'present' ? PRESENT[lang] : formatYm(end);
  return to === from ? from : `${from} – ${to}`;
}
