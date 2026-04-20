# TheLatest

A modern news app that pulls stories from many trusted publishers into one place.

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
