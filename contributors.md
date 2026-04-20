# Contributors Guide (Plain English)

This file is a simple guide for anyone helping on TheLatest.

## What changed recently

These are the important updates now in the app:

1. Topic filters were fixed across sections.
   - Choosing a topic now filters Top Stories, Opinions, Videos, Podcasts, and Social more reliably.

2. Top Stories no longer disappear when topic data is thin.
   - The app now backfills from broader live sources when needed.

3. Social topic mode now uses real feed data.
   - Social pages request real topic-aware RSS-backed content and broaden fallback if results are sparse.

4. Duplicate content handling improved.
   - Same/near-same items are removed more consistently.

5. Fetch reliability improved.
   - Retries + cache strategy reduce blank states during temporary feed/network failures.

6. Media quality improved.
   - Better image handling and stronger thumbnail selection.

---

## Before you start coding

1. Install dependencies:
```bash
npm install
```

2. Run app:
```bash
npm run dev
```

3. If you need serverless functions locally:
```bash
npm run dev:netlify
```

---

## How to test your changes quickly

Do this before opening a PR:

1. Build check:
```bash
npm run build
```

2. Manual spot-check:
- Home page loads content
- Topic change updates all major sections
- Top Stories does not go empty on common topics
- Social page shows topic-aware content when possible
- No obvious duplicate spam in cards/lists

---

## Editing rules for this repo

- Keep changes focused and small.
- Avoid touching unrelated files.
- Prefer shared utilities over repeated per-page logic.
- If you update behavior, also update docs (`README.md`, this file, or `CONTRIBUTING.md`).

---

## Where key logic lives

- Topic state: `src/context/SearchContext.jsx`
- Home composition and section fetch flow: `src/pages/HomePage.jsx`
- RSS transport/caching/retry: `src/rssService.js`
- Content fetch service layer: `src/newsService.js`
- Social feed service: `src/socialMediaService.js`
- Shared topic matcher: `src/utils/topicFiltering.js`
- Shared dedupe helper: `src/utils/contentDeduplication.js`

---

## PR checklist (simple)

- [ ] App runs locally
- [ ] `npm run build` passes
- [ ] Topic filtering behavior still works
- [ ] No new console errors on main pages
- [ ] Docs updated if behavior changed

Thanks for contributing.