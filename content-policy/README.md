# Content policy

`scripts/content-policy.mjs` checks content for denylisted terms, phone numbers, install counts and non-allow-listed repo links.
The denylist is never committed. It is read from the `CONTENT_DENYLIST` env var (a CI secret), or else from the git-ignored `content-policy/denylist.local.json`; add entries with `node scripts/denylist-add.mjs '<term>'`.
With neither present, local runs warn and skip the denylist check; with `CI=true` they fail.
