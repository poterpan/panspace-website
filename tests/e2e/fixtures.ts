import { test as base, expect } from '@playwright/test';
import { BOOT_KEY } from '../../src/lib/storage';

type Options = { bootSeen: boolean };

export const test = base.extend<Options>({
  bootSeen: [true, { option: true }],
  page: async ({ page, bootSeen }, use) => {
    if (bootSeen) {
      await page.addInitScript((key) => {
        try {
          window.localStorage.setItem(key, '1');
        } catch {
          /* storage blocked in this test: fine */
        }
      }, BOOT_KEY);
    }
    await use(page);
  },
});

export { expect };

/** Makes every access to window.localStorage throw, like a blocked-storage browser. */
export const BLOCK_STORAGE = () => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('blocked', 'SecurityError');
    },
  });
};
