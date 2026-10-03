import { buildBootTimeline, type BootLine } from '../lib/boot';
import { BOOT_KEY, safeSet } from '../lib/storage';

function run(): void {
  const root = document.documentElement;
  const overlay = document.getElementById('boot');
  if (!overlay || root.dataset.boot !== 'play') return;

  const lines = JSON.parse(overlay.dataset.lines ?? '[]') as BootLine[];
  const { steps, foldAt, totalMs } = buildBootTimeline(lines);
  const els = overlay.querySelectorAll<HTMLElement>('.boot-line');
  const timers: number[] = [];

  const finish = () => {
    timers.forEach((id) => window.clearTimeout(id));
    window.removeEventListener('keydown', finish);
    window.removeEventListener('pointerdown', finish);
    safeSet(() => window.localStorage, BOOT_KEY, '1');
    root.dataset.boot = 'done';
  };

  for (const step of steps) {
    const el = els[step.lineIndex];
    if (!el) continue;
    timers.push(
      window.setTimeout(() => {
        el.style.setProperty('--dur', `${step.duration}ms`);
        el.classList.add('is-on');
      }, step.at),
    );
  }
  timers.push(window.setTimeout(() => (root.dataset.boot = 'folding'), foldAt));
  timers.push(window.setTimeout(finish, totalMs));
  window.addEventListener('keydown', finish);
  window.addEventListener('pointerdown', finish);
}

run();
