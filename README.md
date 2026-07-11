# TheLatest

A modern news app that pulls stories from many trusted publishers into one place.

## 2026 update highlights

Recent work in this repo now includes:
- A redesigned editorial homepage and section layout with stronger Apple News style structure.
- A rebuilt desktop header with scrollable navigation, working dropdown flyouts, a profile menu, integrated date treatment, and tighter utility spacing.
- A desktop header utility refinement that keeps the theme toggle adjacent to the profile/login icon.
- A tighter 390px mobile shell with simplified top chrome, smaller section typography, a shared route-persistent mobile header, and a native-app-style mobile footer removal in favor of the bottom dock.
- Dedicated topic destinations from navigation dropdowns, plus topic-specific all-news, all-opinions, all-videos, and all-podcasts pages.
- Shared Jeff-style ad treatments through the reusable ad component, including rotating creative variations so placements do not feel static.
- Netlify-backed auth, session persistence, following, dashboard flows, shared summaries, feed health endpoints, story snapshot persistence, trending analytics, engagement tracking, and Claude-assisted search support.
- Graceful Netlify Blob fallbacks outside managed Netlify runtimes, plus optional manual Blob credentials for Docker, CI, and other non-Netlify environments.
- Stable story routes backed by persisted article snapshots so saved items, generated content, and direct story links are more reliable.
- Shared backend rate limiting across expensive RSS and AI function paths to reduce abuse and cold-path churn.
- Trust and editorial transparency pages for about, editorial standards, corrections, and contact.
- Generated-content labeling across key story surfaces so fallback AI content is clearly identified in the UI.
- Route-aware SEO metadata, structured data, sitemap generation, robots generation, and canonical handling.
- Privacy and terms pages, cookie consent controls, and analytics gating tied to consent state.
- Broader caching and resilience improvements across RSS aggregation, topic/search loading, stale-cache fallback, repeat-query performance, cached backend search snapshots, normalized news cache keys, and lighter fast-path feed selection.
- Advanced search improvements including faster repeat queries, source filters, query view pills, and research shortcuts.
- Claude-powered shared summaries now carry provider/source context and enforce a concise 700-character summary cap.
- Backend story clustering and perspective labeling for side-by-side editorial comparisons.
- Deployment hardening through Docker, environment verification, smoke-test automation, bundle audits, latency audits, and deploy-readiness workflow checks.

## What this app does

TheLatest combines:
- Top news stories
- Opinion pieces
- Videos
- Podcasts
- Social media headlines

Instead of opening 10+ websites, you can browse everything in one feed.

---

## What was recently fixed and improved

### 0) Design structure and navigation were overhauled
The app now follows a more structured editorial design system across the homepage, category pages, topic pages, and shared content sections.

This includes:
- A stronger hero, summary, section, and card hierarchy.
- Desktop nav dropdowns that remain accessible even with a scrollable tab lane.
- A combined desktop profile menu for dashboard, following, and auth actions.
- Topic-aware routes from navigation dropdown items instead of generic search-only destinations.
- Topic collection routes such as `/topic/:topicSlug/all-news` and companion media pages.

### 0.1) Shared ads now use richer creative variations
The shared ad component was rewritten so existing placements inherit a more polished leaderboard/sidebar treatment automatically.

What changed:
- Shared slot presets now render richer placeholder creatives.
- Creative variations rotate by slot and time key so ad surfaces feel less repetitive.
- Category pages, homepage placements, and sidebar ad surfaces now stay visually consistent through one component.

### 0) RSS bundle is now centralized and prioritized
The RSS aggregator can now prepend one RSS.app bundle feed across key feed groups (news, opinions, videos, podcasts, and category feeds) without duplicating URLs.

Environment variables:
- `RSS_APP_BUNDLE_FEED_URL`
- `RSS_APP_BUNDLE_SOURCE`

### 0) Videos and podcasts can now run from one RSS feed
The aggregator now supports using a single RSS source as the sole feed for both Videos and Podcasts.

Current configured feed:
- https://rss.app/feeds/_D52QE16IQULFQQkk.xml

### 0.1) Image URL filtering in RSS fetch was removed
Image extraction now accepts all discovered image URLs from feed fields and embedded HTML image tags, instead of filtering by tracking/size keywords.

### 1) Topic filtering now works across the whole app
When you select a topic (not `ALL`), sections now properly load topic-related content.

This includes:
- Top Stories
- Opinions
- Videos
- Podcasts
- Social

### 2) Top Stories no longer go empty on topic changes
If a topic has too little content, the app now safely backfills from broader live feeds so sections stay populated.

### 3) Social feed now uses real RSS-backed data
Topic mode in social now requests real feed data (with fallback broadening) instead of relying on mock-only paths.

### 4) Better duplicate removal
Content is deduplicated more consistently across news, opinions, videos, podcasts, and search.

### 5) Better image reliability and quality
- YouTube thumbnails prefer higher-quality sources when available.
- Feed/article images are handled more robustly.

### 6) More resilient fetch behavior
The app now leans on:
- Retry logic for temporary failures
- Fresh cache for normal performance
- Stale cache reuse for short outages

This helps prevent blank sections during feed instability.

### 7) Source contribution diagnostics for feed quality
You can now inspect which outlets are actually contributing items.

Use:
- `/.netlify/functions/rss-aggregator?type=news&sourceStats=1`
- `/.netlify/functions/rss-aggregator?type=news&category=business&sourceStats=1`
- `/.netlify/functions/rss-aggregator?search=giuliani&sourceStats=1`

Responses include:
- `sourceStats.totalItems`
- `sourceStats.uniqueSources`
- `sourceStats.topSources` (source + count)

### 8) Strict video vs podcast separation and de-duplication
Media classification is now shared across service and page layers so users do not see video/podcast duplicates.

Rules applied:
- Video and podcast items are classified from URL/type/category/source/title/description signals.
- Items are de-duplicated within each section by stable media keys.
- Cross-duplicates are removed between video and podcast candidate pools before rendering.
- Bundle-driven topic searches now preserve this separation on both Videos and Podcasts pages.

### 9) Major performance upgrade for smoother scrolling and faster loading
The app now includes a full performance pass focused on low-power devices and long news feeds.

What changed:
- Virtualized rendering for heavy lists so only a small visible window is kept in the DOM.
- Progressive section loading using reusable in-view observers.
- Shared responsive image component with `srcset`/`sizes` for smaller image payloads.
- Skeleton card placeholders to reduce layout shifts while content is loading.
- Search result caching improvements for faster repeat queries.
- Critical preload hints for first font, first image, and first feed request.
- Lighter visual effects in hot paths to reduce scroll jank on weak GPUs.

Expected user-facing impact:
- Faster initial page responsiveness.
- Smoother scrolling in long result pages.
- Reduced layout jumping during asynchronous loads.
- Better performance consistency on older phones and budget laptops.

### 10) Auth, follows, summaries, persistence, and operational endpoints were added
The app now supports a fuller logged-in experience and more backend operational tooling.

This includes:
- Session-backed authentication.
- Following and dashboard pages.
- Shared summary storage.
- Story snapshot persistence for stable story-reader hydration and durable story links.
- Shared rate limiting for expensive AI and feed endpoints.
- Feed health and warm-content endpoints.
- Engagement tracking and trending data collection.

### 11) Search, SEO, trust, and compliance work were added
The app now has a more production-ready search/discovery layer and stronger launch-readiness basics.

This includes:
- Route-level SEO metadata with Open Graph, Twitter tags, canonicals, and JSON-LD.
- Build-time `sitemap.xml` and `robots.txt` generation.
- About, editorial standards, corrections, and contact routes linked from the shared footer.
- Privacy and terms routes linked from the shared footer.
- Cookie consent state with analytics opt-in gating.
- Advanced search view filters, source filters, and research links.
- Cached backend search snapshots so repeated searches avoid redoing the full feed fan-out.
- Generated-content labeling on major content surfaces so fallback content stays transparent.

### 12) Local Netlify development on Windows was hardened
The local Netlify launcher was reworked to be more reliable on Windows.

This includes:
- Safer process spawning through `cmd.exe`.
- Port readiness checks before starting the Netlify layer.
- Better handling of occupied default ports.
- Cleaner coordination between Vite and Netlify local dev.

### 13) Mobile shell and deployment guardrails were tightened
The mobile experience and deployment story were both hardened further.

This includes:
- Smaller mobile section headings for Top Stories, AI Summary, Opinions, Podcasts, and Advanced Search.
- Mobile footer removal so the bottom dock remains the single persistent navigation surface on app-like mobile layouts.
- Docker support for reproducible production builds.
- Deployment environment verification through `npm run verify:deploy-env`.
- A Netlify smoke-test script for checking deployed function endpoints.

### 14) Desktop header hover access was repaired
Desktop navigation dropdowns now remain reachable on hover, and the shared header regression suite covers that interaction.

This includes:
- fixing the dropdown state reset logic so opening a menu does not immediately close it
- tightening the hover path between the top-level tab and flyout
- adding a focused desktop hover regression test

### 15) Claude summaries, search, and feed routing were tightened
The AI and feed layers were refined so shared summaries are clearer, repeat searches are lighter, and generic news requests avoid redundant cold paths.

This includes:
- Claude-backed shared summaries that return provider/source context and stay capped at 700 characters.
- Claude-assisted search endpoint support for smarter search guidance and article discovery.
- Normalized `category=news` handling so generic news requests share the same cache and snapshot path.
- Faster generic news and opinions fast paths by preferring the healthiest feed set first.
- A lighter `fetchOpinions()` client wrapper so it avoids unnecessary sequential fallback work.

### 17) Launch-readiness guardrails were expanded
The repo now has stronger operational checks around deploys, feed health, and generated fallback behavior.

This includes:
- A site health endpoint for feed, analytics, and generated-content visibility.
- Bundle and latency audit scripts for release checks.
- A deploy-readiness workflow and stronger predeploy verification paths.
- Additional repo cleanup so lint, tests, and production builds are easier to keep green.

### 16) The mobile header and section chrome were unified further
The shared mobile shell was tightened so the header stays consistent across routes and section headers behave more predictably on smaller screens.

This includes:
- One persistent mobile header treatment across homepage, news, category, topic, and search routes.
- A mobile search control beside the theme toggle in the shared header.
- Tighter section spacing and header alignment updates for mobile Top Stories and category layouts.

---

## Tech stack

- React + Vite
- Netlify Functions
- RSS aggregation
- IndexedDB caching

---

## Quick start (local)

### 1) Install dependencies
```bash
npm install
```

### 2) Run the app
```bash
npm run dev
```

If you need Netlify Functions locally, use:
```bash
npm run dev:netlify
```

On Windows, the Netlify launcher now starts Vite first and then attaches Netlify dev using a safer spawn path.

### 3) Build for production
```bash
npm run build
```

### 3.1) Verify deployment environment
```bash
npm run verify:deploy-env
```

Run this before deploying to Netlify or wiring up CI.
It checks the current environment for the values the backend and auth flows expect.

For a stricter manual release check:
```bash
npm run verify:deploy-env:strict
```

### 4) Run tests
```bash
npm test
```

For the shared header regression check specifically:
```bash
npm test -- Header.test.jsx
```

---

## Environment notes

Copy `.env.example` to `.env` and set keys as needed.

For a minimal RSS-first local setup with no paid AI provider, start from:
- `.env.rss-first.example`

That template keeps the app on the built-in RSS feed lists, uses the editorial summary path, and only requires `SESSION_TOKEN_PEPPER`.

If you use social RSS route resolution, set:
- `RSSHUB_BASE_URL` (for example: `https://rsshub.app`)

If you need Blob-backed storage outside Netlify itself, set both:
- `NETLIFY_BLOBS_SITE_ID`
- `NETLIFY_BLOBS_TOKEN`

Without those manual Blob credentials, non-Netlify runtimes now degrade gracefully instead of crashing.

---

## Docker parity

Docker is useful here for reproducible install/build behavior and consistent Node runtime parity.
It does not replace Netlify-specific behavior such as Functions routing or managed Blob access.

Build the image:
```bash
docker build -t thelatest .
```

Run the built app:
```bash
docker run --rm -p 8080:80 thelatest
```

Use Docker to verify:
- dependency install consistency
- Node version consistency
- production build output consistency

Smoke test a deployed Netlify preview or production URL:
```bash
npm run smoke:netlify-preview -- https://your-site.netlify.app
```

For the full production rollout sequence, see:
- `RELEASE_CHECKLIST.md`

For secret and environment setup, see:
- `SECRETS_SETUP.md`

Use Netlify preview or production to verify:
- function routing
- Blob-backed persistence
- environment variable injection
- deploy-time permissions and site linkage

---

## RSS feed configuration (videos + podcasts)

For an RSS-first startup, the app already uses all currently configured feeds in `RSS_FEEDS` and then prepends the shared bundle feed for the eligible groups.

That means:
- you do not need to enumerate feeds in `.env`
- leaving `RSS_APP_BUNDLE_FEED_URL` unset still uses the built-in bundle default
- adding more feeds to the existing RSS.app bundle automatically flows into the app without code changes
- adding brand-new direct feeds still happens in `netlify/functions/rss-aggregator.js`

To change the single RSS feed used by both Videos and Podcasts:

1. Open `netlify/functions/rss-aggregator.js`
2. Locate `RSS_FEEDS.videos` and `RSS_FEEDS.podcasts`
3. Replace the `url` value in both entries with your new RSS feed

Current setup points both to:
- `https://rss.app/feeds/_D52QE16IQULFQQkk.xml`

Tip: keep the two URLs identical if you want one shared feed for both sections.

If you want the broadest RSS-first setup, keep the current configured `RSS_FEEDS` lists and continue adding sources into the shared bundle where it makes sense. That gives you both:
- the direct curated feeds already in code
- the aggregated bundle feed layered on top

---

## Project structure (high level)

- `src/pages` → full pages
- `src/components` → reusable UI sections
- `src/utils` → shared helpers (filtering, dedupe, image tools)
- `src/services` + `src/*Service.js` → data fetching and formatting
- `netlify/functions` → serverless RSS and social feed aggregation

---

## Social feed setup (simple)

You can configure social feeds in:
- `netlify/functions/social-feed-config.cjs`

Each feed can be route-based or URL-based, with topic tags.

---

## Current todo

- [ ] Implement full side-by-side UI parity on top of the clustering and perspective backend.
- [ ] Continue backend caching work for slower secondary query surfaces and feed fan-out paths.
- [ ] Harden production auth flows with email verification and password reset.
- [ ] Expand monitoring from the health endpoint into alerting and frontend/function error reporting.
- [ ] Review and clean dependency audit issues.

---

## Contribution links

- Contributor quick guide: `contributors.md`
- Developer workflow guide: `CONTRIBUTING.md`
- Release checklist: `RELEASE_CHECKLIST.md`
- Secrets setup: `SECRETS_SETUP.md`

---

## License

MIT
