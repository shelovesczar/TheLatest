# Deployment Guide for Netlify

## Reality check

This app can deploy cleanly to Netlify, but successful local development does not automatically prove production readiness.

The live deployment depends on:
- Netlify Functions
- Netlify-managed Blob storage
- auth/session environment configuration
- optional AI provider credentials
- optional external news and social feed configuration

Docker helps standardize the runtime and build process.
Netlify preview or production is still required to validate Netlify-specific services.

---

## Recommended release flow

1. Install dependencies.
```bash
npm install
```

2. Verify the deployment environment.
```bash
npm run verify:deploy-env
```

3. Build the production bundle.
```bash
npm run build
```

4. Validate with the Netlify local runtime.
```bash
npm run dev:netlify
```

5. Smoke test a preview or production deploy.
```bash
npm run smoke:netlify-preview -- https://your-site.netlify.app
```

6. Deploy to a Netlify preview or production target.

---

## Environment expectations

Required:
- `SESSION_TOKEN_PEPPER`

Recommended for full feature coverage:
- `ADMIN_EMAILS`
- `RSSHUB_BASE_URL`
- `RSS_APP_BUNDLE_FEED_URL`
- `RSS_APP_BUNDLE_SOURCE`
- `NEWS_API_KEY`
- `GNEWS_API_KEY`
- `SOCIAL_RSS_FEEDS`
- one of `VITE_OPENAI_API_KEY`, `VITE_ANTHROPIC_API_KEY`, or `VITE_PERPLEXITY_API_KEY`
- `ANTHROPIC_API_KEY`

Optional for Docker, CI, or other non-Netlify runtimes that still need Blob access:
- `NETLIFY_BLOBS_SITE_ID`
- `NETLIFY_BLOBS_TOKEN`

Netlify production normally injects Blob access automatically, so the manual Blob vars are primarily for non-Netlify runtimes.

---

## What Docker proves

Docker is useful for:
- consistent Node version behavior
- reproducible dependency installation
- reproducible frontend production builds
- repeatable static output validation

Docker does not prove by itself:
- Netlify Function routing
- Netlify Blob access
- Netlify environment injection
- deploy-time site permissions or admin access

Build the image:
```bash
docker build -t thelatest .
```

Run the image:
```bash
docker run --rm -p 8080:80 thelatest
```

---

## Live deployment checklist

Before calling the app finished, verify:
1. `npm run verify:deploy-env` passes for the target environment.
2. `npm run build` passes.
3. `npm run smoke:netlify-preview -- <deploy-url>` passes.
4. Netlify deploy logs show successful function bundling.
5. `/.netlify/functions/rss-aggregator?type=news` returns JSON on the deployed site.
6. auth register/login/logout flows succeed on the deployed site.
7. Blob-backed features such as sessions, follows, shared summaries, and analytics do not return function errors.
8. key mobile routes render correctly at 390px width.

---

## GitHub Actions automation

The repo now includes a workflow at `.github/workflows/deploy-readiness.yml`.

It provides:
- build and focused regression coverage on PRs and main pushes
- a deploy environment gate on main pushes and manual runs
- a manual smoke-test entry point for a supplied Netlify preview or production URL

---

## Important note on fallbacks

The repo now degrades gracefully when Blob access is unavailable outside Netlify.
That means Docker or other non-Netlify runtimes can still boot without crashing, but Blob-backed persistence will no-op unless valid manual Blob credentials are supplied.
