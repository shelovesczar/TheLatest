# Release Checklist

Use this checklist for a production rollout to Netlify.

## 1. Environment and secrets

Set these GitHub Actions secrets for `.github/workflows/deploy-readiness.yml`:
- `SESSION_TOKEN_PEPPER`
- `ADMIN_EMAILS`
- `RSSHUB_BASE_URL`
- `RSS_APP_BUNDLE_FEED_URL`
- `RSS_APP_BUNDLE_SOURCE`
- `NEWS_API_KEY`
- `GNEWS_API_KEY`
- `SOCIAL_RSS_FEEDS`
- `VITE_OPENAI_API_KEY` or `VITE_ANTHROPIC_API_KEY` or `VITE_PERPLEXITY_API_KEY`
- `ANTHROPIC_API_KEY`
- `NETLIFY_BLOBS_SITE_ID` and `NETLIFY_BLOBS_TOKEN` only if non-Netlify runtimes need live Blob access

Set the same runtime values in Netlify site environment variables where applicable.

## 2. Local verification

Run:
```bash
npm install
npm run verify:deploy-env
npm test -- Header.test.jsx
npm run build
```

If validating Netlify behavior locally, run:
```bash
npm run dev:netlify
```

## 3. Docker parity

Start Docker Desktop.

Build the production image:
```bash
docker build -t thelatest .
```

Run the container:
```bash
docker run --rm -p 8080:80 thelatest
```

Verify the static app shell loads on `http://localhost:8080`.

## 4. Preview deploy verification

After Netlify creates a preview URL, run:
```bash
npm run smoke:netlify-preview -- https://your-preview-url.netlify.app
```

Confirm:
- homepage returns HTML
- `rss-aggregator` returns JSON
- `auth` returns JSON
- `trackEngagement` returns `200` or `202`
- shared summary endpoint returns JSON, even if unavailable

## 5. Manual UI checks

Desktop:
- top nav dropdowns open on hover
- profile/login icon works
- desktop theme toggle works next to the profile/login icon
- search box works

Mobile at 390px:
- footer is removed
- bottom dock remains visible
- section headings are tightened
- home hero and theme toggle look correct

## 6. Netlify production checks

Confirm in Netlify:
- latest deploy built successfully
- functions bundled successfully
- no missing environment variable errors
- Blob-backed endpoints do not fail unexpectedly

## 7. Final go/no-go

Ship only if all of these are true:
- `npm run verify:deploy-env` passes
- `npm run build` passes
- header regression test passes
- smoke test passes against deployed URL
- manual desktop and mobile checks are clean