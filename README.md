# TheLatest

A modern news app that pulls stories from many trusted publishers into one place.

## 2026 update highlights

Recent work in this repo now includes:
- A redesigned editorial homepage and section layout with stronger Apple News style structure.
- A rebuilt desktop header with scrollable navigation, working dropdown flyouts, a profile menu, integrated date treatment, and tighter utility spacing.
- Dedicated topic destinations from navigation dropdowns, plus topic-specific all-news, all-opinions, all-videos, and all-podcasts pages.
- Shared Jeff-style ad treatments through the reusable ad component, including rotating creative variations so placements do not feel static.
- Netlify-backed auth, session persistence, following, dashboard flows, shared summaries, feed health endpoints, trending analytics, and engagement tracking.
- Broader caching and resilience improvements across RSS aggregation, topic/search loading, stale-cache fallback, and repeat-query performance.

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

### 10) Auth, follows, summaries, and operational endpoints were added
The app now supports a fuller logged-in experience and more backend operational tooling.

This includes:
- Session-backed authentication.
- Following and dashboard pages.
- Shared summary storage.
- Feed health and warm-content endpoints.
- Engagement tracking and trending data collection.

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

### 3) Build for production
```bash
npm run build
```

---

## Environment notes

Copy `.env.example` to `.env` and set keys as needed.

If you use social RSS route resolution, set:
- `RSSHUB_BASE_URL` (for example: `https://rsshub.app`)

---

## RSS feed configuration (videos + podcasts)

To change the single RSS feed used by both Videos and Podcasts:

1. Open `netlify/functions/rss-aggregator.js`
2. Locate `RSS_FEEDS.videos` and `RSS_FEEDS.podcasts`
3. Replace the `url` value in both entries with your new RSS feed

Current setup points both to:
- `https://rss.app/feeds/_D52QE16IQULFQQkk.xml`

Tip: keep the two URLs identical if you want one shared feed for both sections.

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

## Contribution links

- Contributor quick guide: `contributors.md`
- Developer workflow guide: `CONTRIBUTING.md`

---

## License

MIT
