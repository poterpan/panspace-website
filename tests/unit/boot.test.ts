import { describe, expect, it } from 'vitest';
import { BOOT_MAX_MS, bootGate, bootGateScript, bootLines, buildBootTimeline } from '../../src/lib/boot';
import { BOOT_KEY } from '../../src/lib/storage';

type FakeWin = Parameters<typeof bootGate>[0];
function win(overrides: { navigated?: boolean; reduced?: boolean; referrer?: string; seen?: string | null; throws?: boolean } = {}): FakeWin {
  const { navigated = false, reduced = false, referrer = '', seen = null, throws = false } = overrides;
  return {
    __psNavigated: navigated,
    matchMedia: () => ({ matches: reduced }),
    document: { referrer },
    location: { origin: 'https://panspace.me' },
    get localStorage() {
      if (throws) throw new DOMException('blocked', 'SecurityError');
      return { getItem: (k: string) => (k === BOOT_KEY ? seen : null) };
    },
  } as unknown as FakeWin;
}

describe('bootGate', () => {
  it('plays on a clean first visit', () => expect(bootGate(win())).toBe(true));
  it('plays after the root language redirect (same-origin referrer "/")', () => {
    expect(bootGate(win({ referrer: 'https://panspace.me/' }))).toBe(true);
  });
  it('plays when arriving from another site', () => expect(bootGate(win({ referrer: 'https://github.com/' }))).toBe(true));
  it('does not play when already seen', () => expect(bootGate(win({ seen: '1' }))).toBe(false));
  it('does not play under reduced motion', () => expect(bootGate(win({ reduced: true }))).toBe(false));
  it('does not play after client-side navigation', () => expect(bootGate(win({ navigated: true }))).toBe(false));
  it('does not play when arriving from another page of the site', () => {
    expect(bootGate(win({ referrer: 'https://panspace.me/zh/work' }))).toBe(false);
  });
  it('treats unreadable storage as already seen', () => expect(bootGate(win({ throws: true }))).toBe(false));
  it('is self-contained: the generated inline script works without imports', () => {
    const fn = new Function('window', `${bootGateScript().replace('document.documentElement.dataset.boot', 'window.__result')}; return window.__result;`);
    const w = win() as unknown as Record<string, unknown>;
    expect(fn(w)).toBe('play');
  });
});

describe('boot timeline', () => {
  const lines = bootLines('Poter Pan', ['ntutbox', 'spine-ai', 'chippot', 'locmotion']);
  it('builds the whoami / ls / open script', () => {
    expect(lines.map((l) => l.kind)).toEqual(['cmd', 'out', 'cmd', 'out', 'cmd']);
    expect(lines[1]?.text).toBe('poter pan');
    expect(lines[3]?.text).toBe('ntutbox/  spine-ai/  chippot/  …');
  });
  it('fits in 2.5 s including the fold', () => {
    const { steps, foldAt, totalMs } = buildBootTimeline(lines);
    expect(totalMs).toBeLessThanOrEqual(BOOT_MAX_MS);
    expect(foldAt).toBeLessThan(totalMs);
    for (let i = 1; i < steps.length; i++) expect(steps[i]!.at).toBeGreaterThan(steps[i - 1]!.at);
  });
  it('compresses long scripts to stay within budget', () => {
    const long = Array.from({ length: 12 }, () => ({ kind: 'cmd' as const, text: 'a-very-long-command --flag' }));
    expect(buildBootTimeline(long).totalMs).toBeLessThanOrEqual(BOOT_MAX_MS);
  });
});
