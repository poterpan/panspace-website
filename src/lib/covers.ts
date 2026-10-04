import type { Locale } from './i18n';
import type { Category } from './taxonomy';

export const COVER_STYLES = ['image', 'phones', 'browser', 'window', 'schematic', 'type'] as const;
export type CoverStyle = (typeof COVER_STYLES)[number];

/** Cover tints: a deep glow behind the cover and a light accent for marks drawn on it. */
export const TINTS = {
  emerald: { glow: '#065f46', accent: '#34d399' },
  blue: { glow: '#1e3a8a', accent: '#60a5fa' },
  violet: { glow: '#4c1d95', accent: '#a78bfa' },
  rose: { glow: '#831843', accent: '#f472b6' },
  amber: { glow: '#7c2d12', accent: '#fb923c' },
  cyan: { glow: '#155e75', accent: '#22d3ee' },
  lime: { glow: '#365314', accent: '#a3e635' },
} as const;
export type Tint = keyof typeof TINTS;
export const TINT_NAMES = Object.keys(TINTS) as [Tint, ...Tint[]];

const CATEGORY_TINT: Record<Category, Tint> = {
  ai: 'emerald',
  web: 'blue',
  ios: 'violet',
  research: 'cyan',
  competition: 'amber',
};

/** An explicit `coverTint` wins; otherwise the first category picks the colour. */
export function coverTint(meta: { coverTint?: Tint; categories: readonly Category[] }): Tint {
  return meta.coverTint ?? CATEGORY_TINT[meta.categories[0] ?? 'web'];
}

export function tintStyle(tint: Tint): string {
  return `--cover-glow:${TINTS[tint].glow};--cover-accent:${TINTS[tint].accent}`;
}

/** A cover's screenshots for one language: `screens` is either shared or split by language. */
export function screensFor<C>(screens: C[] | { zh: C[]; en: C[] } | undefined, lang: Locale): C[] {
  if (!screens) return [];
  return Array.isArray(screens) ? screens : screens[lang];
}
