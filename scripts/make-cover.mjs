#!/usr/bin/env node
// Usage: node scripts/make-cover.mjs <out.png> [#hex] [label]
// Generates a 1600×900 placeholder cover. Real screenshots replace these in Task 14.
import sharp from 'sharp';

const [out, color = '#0f1b33', label = ''] = process.argv.slice(2);
if (!out) {
  console.error('usage: node scripts/make-cover.mjs <out.png> [#hex] [label]');
  process.exit(1);
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#101216"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  <text x="96" y="790" font-family="Menlo, monospace" font-size="56" fill="#e7e9ee">${esc(label)}</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`wrote ${out}`);
