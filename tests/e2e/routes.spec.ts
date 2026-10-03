import { expect, test } from './fixtures';
import { allPaths } from './routes';
import { LOCALES, localizedPath } from '../../src/lib/i18n';

for (const lang of LOCALES) {
  for (const path of allPaths()) {
    const url = localizedPath(lang, path);
    test(`${url} responds 200`, async ({ request }) => {
      expect((await request.get(url)).status()).toBe(200);
    });
  }
}
