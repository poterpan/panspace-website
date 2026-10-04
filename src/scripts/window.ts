import { closeTarget } from '../lib/transitions';
import type { Locale } from '../lib/i18n';

// The page a client-side navigation came from. Survives swaps because this module lives for the session.
let from: string | null = null;
let fromHistory = false;

const trim = (path: string) => path.replace(/(.)\/+$/, '$1');

/** Names only the one card that opens (or receives) the window, so no other card joins the morph. */
function nameCard(root: ParentNode, path: string): void {
  for (const card of root.querySelectorAll<HTMLElement>('[data-vt]')) {
    if (trim(card.getAttribute('href') ?? '') === trim(path)) card.style.setProperty('--vt-card', card.dataset.vt ?? 'none');
  }
}

document.addEventListener('astro:before-preparation', (e) => {
  const { from: fromUrl, to } = e as Event & { from: URL; to: URL };
  from = fromUrl.pathname;
  fromHistory = true;
  nameCard(document, to.pathname);
});

document.addEventListener('astro:before-swap', (e) => {
  nameCard((e as Event & { newDocument: Document }).newDocument, (e as Event & { from: URL }).from.pathname);
});

function sameOriginReferrer(): string | null {
  try {
    const url = new URL(document.referrer);
    return url.origin === location.origin ? url.pathname : null;
  } catch {
    return null;
  }
}

document.addEventListener('astro:page-load', () => {
  const close = document.querySelector<HTMLAnchorElement>('[data-window-close]');
  if (!close) return;
  const lang = document.documentElement.dataset.lang as Locale;
  const target = closeTarget(lang, fromHistory ? from : sameOriginReferrer());
  close.href = target.href;
  // Only a client-side arrival can be undone with history.back() and get the reverse morph.
  close.dataset.back = target.back && fromHistory ? '1' : '';
});

document.addEventListener('click', (e) => {
  const close = (e.target as Element | null)?.closest<HTMLAnchorElement>('[data-window-close]');
  if (!close || close.dataset.back !== '1') return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  history.back();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open]')) return;
  const el = e.target as HTMLElement | null;
  if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
  document.querySelector<HTMLAnchorElement>('[data-window-close]')?.click();
});

// The page around the window is its backdrop: a click there closes the window like ✕ does.
// Both ends of the click must be on the backdrop, so a selection dragged out of the window never closes it.
// Only bare page surface counts: <body> (side gutters) or <main> (the strip around the frame). That excludes
// the window, nav and footer, and <html>, which receives every click while a view transition is running.
const isBackdrop = (target: EventTarget | null) =>
  !!document.querySelector('[data-window]') && (target === document.body || target === document.getElementById('main'));
let pressedOnBackdrop = false;

document.addEventListener('pointerdown', (e) => {
  pressedOnBackdrop = e.button === 0 && isBackdrop(e.target);
});

document.addEventListener('click', (e) => {
  if (!pressedOnBackdrop || !isBackdrop(e.target) || String(window.getSelection() ?? '') !== '') return;
  pressedOnBackdrop = false;
  document.querySelector<HTMLAnchorElement>('[data-window-close]')?.click();
});
