import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

export const LOCAL_DENYLIST = 'content-policy/denylist.local.json';

/** Public repos that may be linked from content. Anything else is rejected (grey-area and private repos included). */
export const ALLOWED_REPOS = [
  'chippot', 'locmotion', 'ntutbox-course', 'ntutbox-website', 'ntutbox-checkin', 'ntutbox-template-api',
  'taipei-traffic-risk-map', 'ntut-ar-campus-tour', 'asr-server', 'incognitoearth', 'baemoments', 'poterpan',
  'panspace-website',
];

export const PHONE_RE = /(?:\+?886[-\s]?|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}/;
export const WEAK_METRIC_RE =
  /\d[\d,.]*\s*[kK萬千]?\+?\s*次?\s*(?:下載|安裝|installs?|downloads?)|(?:下載|安裝)(?:數|次數|量)\s*[:：]?\s*\d/i;

/** @param {string} text */
export function normalize(text) {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

/** @param {string} s */
function sha256(s) {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** @param {string} term @returns {{ len: number, sha256: string }} */
export function hashTerm(term) {
  const n = normalize(term);
  return { len: [...n].length, sha256: sha256(n) };
}

/**
 * Slides a window of each denylisted length over the normalized text and compares hashes.
 * Returns positions only, never the matched text.
 * @param {string} text @param {{ len: number, sha256: string }[]} entries
 */
export function findDenylistHits(text, entries) {
  const chars = [...normalize(text)];
  /** @type {Map<number, Set<string>>} */
  const byLen = new Map();
  for (const e of entries) {
    if (!byLen.has(e.len)) byLen.set(e.len, new Set());
    byLen.get(e.len)?.add(e.sha256);
  }
  /** @type {{ index: number, len: number }[]} */
  const hits = [];
  for (const [len, hashes] of byLen) {
    for (let i = 0; i + len <= chars.length; i++) {
      if (hashes.has(sha256(chars.slice(i, i + len).join('')))) hits.push({ index: i, len });
    }
  }
  return hits;
}

/** @param {string} text @param {string[]} [allowed] */
export function findDisallowedRepoLinks(text, allowed = ALLOWED_REPOS) {
  return [...text.matchAll(/github\.com\/poterpan\/([A-Za-z0-9_.-]+)/gi)]
    .map((m) => (m[1] ?? '').replace(/\.git$/, ''))
    .filter((repo) => !allowed.includes(repo.toLowerCase()));
}

/**
 * Loads denylist entries: `CONTENT_DENYLIST` env first (JSON `{entries}` or newline-separated terms),
 * then the git-ignored local file. Returns null when neither exists.
 * @param {{ env?: Record<string, string | undefined>, file?: string, exists?: (p: string) => boolean, read?: (p: string) => string }} [opts]
 * @returns {{ entries: { len: number, sha256: string }[], source: 'env' | 'file' } | null}
 */
export function loadDenylist({ env = process.env, file = LOCAL_DENYLIST, exists = existsSync, read = (p) => readFileSync(p, 'utf8') } = {}) {
  const raw = env.CONTENT_DENYLIST?.trim();
  if (raw) {
    if (raw.startsWith('{')) return { entries: JSON.parse(raw).entries, source: 'env' };
    const terms = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    return { entries: terms.map(hashTerm), source: 'env' };
  }
  if (exists(file)) return { entries: JSON.parse(read(file)).entries, source: 'file' };
  return null;
}
