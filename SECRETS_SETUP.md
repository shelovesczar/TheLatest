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

Generate it yourself. This is not issued by Netlify, GitHub, or any third-party provider.

PowerShell:

```powershell
[Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Node:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use a different value per environment and store it only in your secret manager or env configuration.

Recommended:

- `ADMIN_EMAILS`
- `RSSHUB_BASE_URL`
- `RSS_APP_BUNDLE_FEED_URL`
- `RSS_APP_BUNDLE_SOURCE`
- `NEWS_API_KEY`
- `GNEWS_API_KEY`
- `SOCIAL_RSS_FEEDS`
- `VITE_OPENAI_API_KEY` or `VITE_PERPLEXITY_API_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY` (required before launch if you want password-reset emails to actually send; see below)
- `EMAIL_FROM`

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
- `RESEND_API_KEY`
- `EMAIL_FROM`

For browser-side AI setup, define only the `VITE_*` provider keys you intentionally want exposed to the frontend build.
Do not set `VITE_ANTHROPIC_API_KEY` in Netlify. Claude-backed summaries and perspective generation should use server-side `ANTHROPIC_API_KEY` only.

## Password-reset emails (Resend)

The "forgot password" flow (`netlify/functions/auth.js` actions `request-password-reset` / `reset-password`) sends its reset link through `netlify/functions/emailService.js`. Until `RESEND_API_KEY` is set, that function logs the email (including the reset link) to the Netlify function console instead of sending it -- usable for local testing, not for real users.

1. Create a account at https://resend.com and generate an API key at https://resend.com/api-keys.
2. Verify a sending domain (or use their `onboarding@resend.dev` test address for early testing only -- it won't reliably deliver to arbitrary recipients).
3. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `The Latest <noreply@yourdomain.com>`) in Netlify's environment variables.

## Notes

- Netlify hosted Functions usually inject Blob access automatically, so production can run without manually setting Blob vars in the Netlify UI.
- If you want zero local `netlify dev`, Docker, CI, or direct Node-function Blob warnings, set both `NETLIFY_BLOBS_SITE_ID` and `NETLIFY_BLOBS_TOKEN` in the root `.env` used on that machine.
- To verify Blob-ready local or CI setup, run `npm run verify:deploy-env:blobs`.
- To audit managed sources that are missing trust, ownership, or perspective metadata, run `npm run audit:sources -- https://your-site.netlify.app`.
- To find `NETLIFY_BLOBS_SITE_ID`, open the Netlify project and copy `Project ID` from `Project configuration > General > Project information`.
- To create `NETLIFY_BLOBS_TOKEN`, generate a Netlify Personal Access Token and keep it server-side only.
- Run `npm run verify:deploy-env` after setting values to confirm the general gate can pass.
- The guided helper is at `scripts/set-hosted-secrets.ps1`.
