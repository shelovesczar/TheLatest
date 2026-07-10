# Secrets Setup

This repo cannot populate secret values automatically. Set them directly in GitHub and Netlify.

## GitHub Actions secrets

Fastest terminal path on this machine:

1. Log in to GitHub CLI:
```powershell
& 'C:\Program Files\GitHub CLI\gh.exe' auth login -h github.com -p https -w
```
2. Run the guided helper:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-hosted-secrets.ps1
```

Manual web path:

1. Open the repository on GitHub.
2. Go to Settings.
3. Open Secrets and variables > Actions.
4. Add the secrets used by `.github/workflows/deploy-readiness.yml`.

Required:
- `SESSION_TOKEN_PEPPER`

Recommended:
- `ADMIN_EMAILS`
- `RSSHUB_BASE_URL`
- `RSS_APP_BUNDLE_FEED_URL`
- `RSS_APP_BUNDLE_SOURCE`
- `NEWS_API_KEY`
- `GNEWS_API_KEY`
- `SOCIAL_RSS_FEEDS`
- `VITE_OPENAI_API_KEY` or `VITE_ANTHROPIC_API_KEY` or `VITE_PERPLEXITY_API_KEY`
- `ANTHROPIC_API_KEY`

Optional for Docker, CI, or other non-Netlify runtimes that still need live Blob persistence:
- `NETLIFY_BLOBS_SITE_ID`
- `NETLIFY_BLOBS_TOKEN`

## Netlify environment variables

Fastest terminal path on this machine:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\set-hosted-secrets.ps1
```

The helper will target the linked Netlify site and set values for `production`, `deploy-preview`, and `branch-deploy`.

Manual web path:

1. Open the site in Netlify.
2. Go to Site configuration.
3. Open Environment variables.
4. Add the runtime values the app uses.

At minimum, production should have:
- `SESSION_TOKEN_PEPPER`

Recommended for fuller behavior:
- `ADMIN_EMAILS`
- `RSSHUB_BASE_URL`
- `RSS_APP_BUNDLE_FEED_URL`
- `RSS_APP_BUNDLE_SOURCE`
- `NEWS_API_KEY`
- `GNEWS_API_KEY`
- `SOCIAL_RSS_FEEDS`
- `ANTHROPIC_API_KEY`

For browser-side AI setup, also define whichever `VITE_*` provider keys you intend to expose to the frontend build.

## Notes

- Netlify hosted Functions usually inject Blob access automatically, so production can run without manually setting Blob vars in the Netlify UI.
- If you want zero local `netlify dev`, Docker, CI, or direct Node-function Blob warnings, set both `NETLIFY_BLOBS_SITE_ID` and `NETLIFY_BLOBS_TOKEN` in the root `.env` used on that machine.
- To verify Blob-ready local or CI setup, run `npm run verify:deploy-env:blobs`.
- To find `NETLIFY_BLOBS_SITE_ID`, open the Netlify project and copy `Project ID` from `Project configuration > General > Project information`.
- To create `NETLIFY_BLOBS_TOKEN`, generate a Netlify Personal Access Token and keep it server-side only.
- Run `npm run verify:deploy-env` after setting values to confirm the general gate can pass.
- The guided helper is at `scripts/set-hosted-secrets.ps1`.