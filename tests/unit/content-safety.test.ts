import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PHONE_RE, WEAK_METRIC_RE, findDenylistHits, findDisallowedRepoLinks,
} from '../../scripts/content-policy.mjs';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)],
  );
}

const denylist = JSON.parse(readFileSync('content-policy/denylist.json', 'utf8')) as {
  entries: { len: number; sha256: string }[];
};
const files = walk('src/content').filter((f) => /\.(ya?ml|mdx?)$/.test(f));

describe('content policy (all files under src/content)', () => {
  it('finds content files', () => expect(files.length).toBeGreaterThan(0));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    it(`${file}: no denylisted terms`, () => expect(findDenylistHits(text, denylist.entries)).toEqual([]));
    it(`${file}: no phone numbers`, () => expect(text).not.toMatch(PHONE_RE));
    it(`${file}: no install/download counts`, () => expect(text).not.toMatch(WEAK_METRIC_RE));
    it(`${file}: only allow-listed GitHub repos`, () => expect(findDisallowedRepoLinks(text)).toEqual([]));
  }
});
