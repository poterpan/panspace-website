import { describe, expect, it } from 'vitest';
import { BOOT_KEY, LANG_KEY, safeGet, safeSet } from '../../src/lib/storage';

function memory(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}
const throwing = () => {
  throw new DOMException('blocked', 'SecurityError');
};

describe('storage keys', () => {
  it('are namespaced and stable', () => {
    expect(BOOT_KEY).toBe('panspace:boot-seen');
    expect(LANG_KEY).toBe('panspace:lang');
  });
});

describe('safeGet / safeSet', () => {
  it('round-trips through working storage', () => {
    const s = memory();
    expect(safeSet(() => s, 'k', 'v')).toBe(true);
    expect(safeGet(() => s, 'k')).toBe('v');
  });
  it('returns null / false when getting the storage object throws', () => {
    expect(safeGet(throwing, 'k')).toBeNull();
    expect(safeSet(throwing, 'k', 'v')).toBe(false);
  });
  it('returns null / false when the storage methods throw', () => {
    const bad = { getItem: throwing, setItem: throwing } as unknown as Storage;
    expect(safeGet(() => bad, 'k')).toBeNull();
    expect(safeSet(() => bad, 'k', 'v')).toBe(false);
  });
});
