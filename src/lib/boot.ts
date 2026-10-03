export const BOOT_MAX_MS = 2500;
export const FOLD_MS = 400;

export type BootLine = { kind: 'cmd' | 'out'; text: string };
export type BootStep = { lineIndex: number; at: number; duration: number };

type GateWindow = {
  __psNavigated?: boolean;
  matchMedia(query: string): { matches: boolean };
  document: { referrer: string };
  location: { origin: string };
  localStorage: { getItem(key: string): string | null };
};

/**
 * Decides whether the boot sequence plays. MUST stay self-contained (no imports, no outer
 * constants): it is serialized with Function#toString into an inline <head> script.
 * The storage key literal must equal BOOT_KEY in storage.ts; a unit test pins this.
 */
export function bootGate(win: GateWindow): boolean {
  try {
    if (win.__psNavigated) return false;
    if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const ref = win.document.referrer;
    if (ref) {
      const from = new URL(ref);
      if (from.origin === win.location.origin && from.pathname !== '/') return false;
    }
    return win.localStorage.getItem('panspace:boot-seen') === null;
  } catch {
    return false;
  }
}

export function bootGateScript(): string {
  return `if((${bootGate.toString()})(window))document.documentElement.dataset.boot='play';`;
}

export function bootLines(name: string, slugs: string[]): BootLine[] {
  const shown = slugs.slice(0, 3).map((s) => `${s}/`).join('  ');
  return [
    { kind: 'cmd', text: 'whoami' },
    { kind: 'out', text: name.toLowerCase() },
    { kind: 'cmd', text: 'ls ./work' },
    { kind: 'out', text: slugs.length > 3 ? `${shown}  …` : shown },
    { kind: 'cmd', text: 'open panspace' },
  ];
}

export function buildBootTimeline(
  lines: BootLine[],
  opts: { charMs?: number; outMs?: number; gapMs?: number; startMs?: number; maxMs?: number; foldMs?: number } = {},
): { steps: BootStep[]; foldAt: number; totalMs: number } {
  const { charMs = 38, outMs = 60, gapMs = 110, startMs = 150, maxMs = BOOT_MAX_MS, foldMs = FOLD_MS } = opts;
  let t = startMs;
  const raw = lines.map((line, lineIndex) => {
    const duration = line.kind === 'cmd' ? line.text.length * charMs : outMs;
    const step = { lineIndex, at: t, duration };
    t += duration + gapMs;
    return step;
  });
  const budget = maxMs - foldMs;
  const scale = t > budget ? budget / t : 1;
  const steps = raw.map((s) => ({ lineIndex: s.lineIndex, at: Math.round(s.at * scale), duration: Math.round(s.duration * scale) }));
  const foldAt = Math.min(Math.round(t * scale), budget);
  return { steps, foldAt, totalMs: foldAt + foldMs };
}
