# The Latest

The Latest is a React and Netlify-powered news platform that aggregates live coverage, opinions, videos, podcasts, and social signals into a single editorial experience. It combines multi-source discovery, AI-assisted context, trust metadata, user follows, and serverless feed orchestration so readers can move from headlines to deeper context without bouncing across multiple products.

Created by Cesar Hernandez  
Contributors: Ritik Patani and Lanna Hu

## What the project does

The app is built to unify several layers of news consumption in one place:

- Live news aggregation from multiple sources through RSS and server-side feed orchestration.
- Opinion, video, podcast, and social surfaces alongside standard news coverage.
- Topic-aware search and discovery across content types.
- AI-generated summary and search-assist flows for faster scanning and follow-up research.
- Source trust context, perspective labels, and source-profile pages.
- Story clustering and side-by-side perspective comparison for major stories.
- User accounts, session persistence, follows, dashboard, and personalized recommendation rails.
- Saved/history-style browsing and stable article routes backed by story snapshots.
- Analytics and engagement tracking for content interaction and operational monitoring.
- SEO, sitemap, structured metadata, privacy controls, and deploy-readiness tooling.

## Core features

### Reader experience

- Editorial homepage with hero, top stories, AI briefing, trending, and topic-driven sections.
- Dedicated pages for news, opinions, videos, podcasts, social, following, dashboard, search, article reading, and source profiles.
- Route-persistent desktop and mobile navigation, including desktop flyouts and mobile dock patterns.
- Advanced search with content-type views, source filters, archive/history support, and research shortcuts.
- Stable story URLs and article hydration via persisted story snapshots.

### Trust and context

- Source profiles with ownership, funding, perspective, factuality shorthand, and methodology notes.
- Source-level truth score context on key surfaces.
- Perspective labeling using server-side classification with source-map fallback.
- Typed story dossier sections and engagement measurement in the article reader.

### Personalization and accounts

- Netlify-backed authentication with register, login, logout, and session hydration.
- Following and dashboard flows for categories, topics, and sources.
- Personalized `For You` recommendations that blend follows with AI-assisted related-topic discovery.

### Platform and operations

- Netlify Functions for RSS aggregation, social fetches, auth, story snapshots, shared summaries, trending, analytics, and health endpoints.
- Graceful Blob-storage fallbacks outside managed Netlify runtimes.
- Build-time sitemap generation and prerender steps.
- Smoke tests, deploy-env verification, bundle audits, and latency audits.

## Tech stack

### Frontend

- React 19
- Vite
- React Router
- Font Awesome
- `@tanstack/react-virtual`

### Backend and platform

- Netlify Functions
- Netlify Blobs
- RSS Parser
- Axios

### Quality and tooling

- Vitest
- Testing Library
- ESLint
- Docker
- Netlify CLI workflow via local scripts

## High-level architecture

```text
src/
  components/    Shared UI, layout, and section-level presentation
  context/       Auth, consent, and search state
  hooks/         Shared viewport and scrolling hooks
  pages/         Route-level page components
  services/      Client-side API wrappers and orchestration
  utils/         Trust, routing, filtering, dedupe, persistence, SEO helpers

netlify/functions/
  auth.js                Session auth endpoints
  rss-aggregator.js      Main feed aggregation and search backend
  fetchSocialFeeds.js    Social source aggregation
  perspective.js         Server-side perspective labeling
  sharedSummary.js       Shared AI summary persistence
  storySnapshot.js       Durable story route hydration
  trackEngagement.js     Engagement analytics
  trending.js            Trending/behavior signals
  siteHealth.js          Operational health endpoint
```

## Local setup

### Prerequisites

- Node.js `>=20 <23`
- npm
- Netlify account if you want full hosted-function parity
- Optional API/provider credentials for richer AI, feed, and social behavior

### 1. Install dependencies

```bash
npm install
```

### 2. Create local environment configuration

Use the repo's env template as your starting point and add the values you actually need for your workflow.

Minimum useful local setup:

- `SESSION_TOKEN_PEPPER`

Recommended server/runtime variables for fuller behavior:

- `ADMIN_EMAILS`
- `RSSHUB_BASE_URL`
- `RSS_APP_BUNDLE_FEED_URL`
- `RSS_APP_BUNDLE_SOURCE`
- `RSS_APP_AUTH_TOKEN` or `RSS_APP_API_KEY` / `RSS_APP_API_SECRET`
- `NEWS_API_KEY`
- `GNEWS_API_KEY`
- `SOCIAL_RSS_FEEDS`
- `ANTHROPIC_API_KEY`

Optional browser-exposed AI keys, depending on which frontend provider path you want active:

- `VITE_OPENAI_API_KEY`
- `VITE_PERPLEXITY_API_KEY`

Do not set `VITE_ANTHROPIC_API_KEY`; Claude-backed summaries and perspective generation use server-side `ANTHROPIC_API_KEY` only.

Optional for Blob-backed persistence outside managed Netlify runtimes:

- `NETLIFY_BLOBS_SITE_ID`
- `NETLIFY_BLOBS_TOKEN`

For the complete environment walkthrough, see [SECRETS_SETUP.md](SECRETS_SETUP.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

### 3. Start local development

Frontend-only dev server:

```bash
npm run dev
```

Frontend plus local Netlify Functions:

```bash
npm run dev:netlify
```

The Netlify dev helper is the better choice if you are working on auth, serverless feed logic, analytics, shared summaries, or Blob-backed features.

## Build, test, and verification

Run the standard checks from the repo root:

```bash
npm run lint
npm test
npm run build
```

Additional project scripts:

```bash
npm run verify:deploy-env
npm run verify:deploy-env:strict
npm run verify:deploy-env:blobs
npm run audit:bundle
npm run audit:latency
npm run audit:sources -- https://your-site.netlify.app
npm run smoke:netlify-preview -- https://your-site.netlify.app
```

What they are for:

- `verify:deploy-env`: checks required and recommended deployment variables.
- `verify:deploy-env:strict`: stricter gate for release readiness.
- `verify:deploy-env:blobs`: confirms non-Netlify Blob credentials when needed.
- `audit:bundle`: inspects production bundle weight.
- `audit:latency`: checks latency-sensitive surfaces.
- `audit:sources`: reports managed sources missing trust, ownership, or perspective metadata.
- `smoke:netlify-preview`: validates a deployed Netlify URL.

## Deployment

The app is configured for Netlify.

- Build output: `dist`
- Functions directory: `netlify/functions`
- SPA rewrites are handled in `netlify.toml`
- The production build also generates sitemap output and prerendered routes

Recommended deployment flow:

```bash
npm install
npm run verify:deploy-env
npm run build
npm run dev:netlify
npm run smoke:netlify-preview -- https://your-site.netlify.app
```

Use Netlify preview or production to validate function routing, Blob persistence, auth/session behavior, and environment injection. Docker is useful for consistent build/runtime parity, but it does not by itself prove Netlify-specific behavior.

## Docker

Build the container:

```bash
docker build -t thelatest .
```

Run the built app:

```bash
docker run --rm -p 8080:80 thelatest
```

## Contributing

If you want to contribute, use this workflow:

1. Install dependencies and configure `.env` values needed for your area of work.
2. Run `npm run dev` or `npm run dev:netlify` depending on whether your change touches functions.
3. Make focused changes that preserve existing route, trust, and feed behavior.
4. Run the narrowest relevant tests first, then broader lint/build checks before opening a PR.
5. Update docs when behavior, commands, or environment expectations change.

Areas contributors commonly touch:

- `src/components` for UI and shared presentation
- `src/pages` for route-level behavior
- `src/utils/sourceProfiles.js` for source trust metadata
- `netlify/functions/rss-aggregator.js` for feed selection and search
- `netlify/functions/fetchSocialFeeds.js` for topic-aware social sourcing
- `src/context/AuthContext.jsx` and auth functions for account/session flows

Contributor docs:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [contributors.md](contributors.md)
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
- [SECRETS_SETUP.md](SECRETS_SETUP.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)

## Notes for future contributors

- Netlify Functions are part of the real application surface, not just deployment glue.
- Some local feed and AI behavior can degrade gracefully when provider credentials are absent.
- Blob-backed features work best in Netlify-hosted environments unless manual Blob credentials are supplied locally.
- Upstream feed quality can vary; local emptiness does not always indicate a code regression.

## License

MIT
