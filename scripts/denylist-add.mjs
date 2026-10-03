#!/usr/bin/env node
// Usage: node scripts/denylist-add.mjs '<term>'
// Stores only {len, sha256} of the normalized term. Never prints or commits the term itself.
import { readFileSync, writeFileSync } from 'node:fs';
import { hashTerm } from './content-policy.mjs';

const term = process.argv[2];
if (!term) {
  console.error("usage: node scripts/denylist-add.mjs '<term>'");
  process.exit(1);
}
const path = 'content-policy/denylist.json';
const data = JSON.parse(readFileSync(path, 'utf8'));
const entry = hashTerm(term);
if (data.entries.some((e) => e.sha256 === entry.sha256)) {
  console.log(`already present (len ${entry.len})`);
} else {
  data.entries.push(entry);
  data.entries.sort((a, b) => a.len - b.len || a.sha256.localeCompare(b.sha256));
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`added (len ${entry.len}); ${data.entries.length} entries total`);
}
