import { isLocale } from '../lib/i18n';
import { LANG_KEY, safeSet } from '../lib/storage';

// Remember an explicit language choice so `/` honours it next time.
document.addEventListener('click', (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-lang-switch]');
  const target = link?.dataset.langSwitch;
  if (isLocale(target)) safeSet(() => window.localStorage, LANG_KEY, target);
});
