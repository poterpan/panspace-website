#!/usr/bin/env node
// Usage: node scripts/denylist-add.mjs '<term>'
// Writes to the git-ignored local denylist (see content-policy/README.md). Stores only {len, sha256} of the normalized term. Never prints or commits the term itself.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { LOCAL_DENYLIST, hashTerm } from './content-policy.mjs';

const term = process.argv[2];
if (!term) {
  console.error("usage: node scripts/denylist-add.mjs '<term>'");
  process.exit(1);
}
const path = LOCAL_DENYLIST; // git-ignored, never committed
const data = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { entries: [] };
const entry = hashTerm(term);
if (data.entries.some((e) => e.sha256 === entry.sha256)) {
  console.log(`already present (len ${entry.len})`);
} else {
  data.entries.push(entry);
  data.entries.sort((a, b) => a.len - b.len || a.sha256.localeCompare(b.sha256));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`added (len ${entry.len}); ${data.entries.length} entries total`);
}
