import { tiltFor, tiltTransform } from '../lib/tilt';

const finePointer = window.matchMedia('(pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let current: HTMLElement | null = null;

function reset(el: HTMLElement): void {
  el.style.transform = '';
  el.style.removeProperty('--mx');
  el.style.removeProperty('--my');
}

document.addEventListener(
  'pointermove',
  (e) => {
    if (e.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches) return;
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-spotlight]') ?? null;
    if (current && current !== el) reset(current);
    current = el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty('--mx', `${x}px`);
    el.style.setProperty('--my', `${y}px`);
    el.style.transform = tiltTransform(tiltFor(x, y, r.width, r.height));
  },
  { passive: true },
);

// Pointer left the window entirely.
document.addEventListener('pointerout', (e) => {
  if (!e.relatedTarget && current) {
    reset(current);
    current = null;
  }
});

// Flatten the tilt before the view-transition snapshot, so the card morphs from a flat box.
document.addEventListener('astro:before-preparation', () => {
  if (current) {
    current.style.transition = 'none';
    reset(current);
    current = null;
  }
});
