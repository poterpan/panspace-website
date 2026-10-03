export const BOOT_KEY = 'panspace:boot-seen';
export const LANG_KEY = 'panspace:lang';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** Reads a key. Returns null when storage is missing, blocked, or throws. */
export function safeGet(getStorage: () => StorageLike, key: string): string | null {
  try {
    return getStorage().getItem(key);
  } catch {
    return null;
  }
}

/** Writes a key. Returns false instead of throwing when storage is unavailable. */
export function safeSet(getStorage: () => StorageLike, key: string, value: string): boolean {
  try {
    getStorage().setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
