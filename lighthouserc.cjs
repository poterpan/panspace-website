// Lighthouse's default form factor is mobile. `canonical` is skipped only because the audit runs on
// 127.0.0.1 while canonicals correctly point at https://panspace.me; nav.spec.ts asserts every canonical.
// Never lower a minScore to make CI pass.
const origin = `http://127.0.0.1:${process.env.E2E_PORT ?? 8788}`;
const minScore = (aggregationMethod = 'median-run') => ['error', { minScore: 0.95, aggregationMethod }];

module.exports = {
  ci: {
    collect: {
      url: ['/zh', '/en', '/zh/work', '/zh/work/ntutbox', '/en/about'].map((p) => origin + p),
      numberOfRuns: 3,
      settings: { skipAudits: ['canonical'], chromeFlags: '--no-sandbox --headless=new' },
    },
    assert: {
      assertions: {
        'categories:performance': minScore(),
        'categories:accessibility': minScore(),
        'categories:best-practices': minScore(),
        'categories:seo': minScore(),
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
