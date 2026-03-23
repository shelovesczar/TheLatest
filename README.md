# TheLatest - News Aggregator

**Stay informed with news from 170+ global sources in one place**

[![GitHub Stars](https://img.shields.io/github/stars/shelovesczar/TheLatest?style=social)](https://github.com/shelovesczar/TheLatest)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR-BADGE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE/deploys)

> 🌍 A modern, free news aggregator built with React + Vite, featuring 170+ RSS feeds from international sources

## What Does This Website Do?

TheLatest is a modern news website that brings together news, opinions, videos, and podcasts from across the internet. Instead of visiting dozens of different news sites, you can see everything in one beautiful, easy-to-use interface.

Think of it like your personal newspaper that automatically updates itself every few minutes with the latest stories from CNN, BBC, ESPN, Variety, TechCrunch, and 100+ other sources.

## Main Features

### 📰 Real-Time News from 170+ Global Sources
- Breaking news from US, UK, Europe, Asia, Africa, Middle East
- Major networks: CNN, BBC, Al Jazeera, Reuters, Deutsche Welle, France24
- Updates every 5 minutes automatically
- No paywalls - all content is free

### 🌍 International Coverage
- **US**: New York Times, Washington Post, CNN, Fox News, NPR
- **UK**: BBC, The Guardian, Sky News
- **Europe**: Deutsche Welle, France24, Euronews
- **Asia**: Al Jazeera, Channel NewsAsia, Times of India
- **Australia**: ABC News Australia
- **Canada**: CBC News

### 🎯 Category Pages
Browse news by topic:
- **Sports** - NFL, NBA, soccer, Olympics, and more
- **Entertainment** - Movies, music, celebrities, awards shows
- **Business & Tech** - Startups, stocks, AI, cryptocurrency
- **Lifestyle** - Health, travel, food, fashion
- **Culture** - Arts, books, museums, society

### 🤖 AI News Summaries
- AI automatically reads and summarizes the day's top stories
- Get the gist of what's happening in 30 seconds
- Updates every hour

### 🔍 Search Everything
- Search across all news articles, videos, and podcasts
- Find stories about any person, event, or topic
- Results ranked by relevance

### 🎥 Videos & 🎙️ Podcasts
- Latest news videos from YouTube
- Trending podcast episodes
- All filtered by category

### 📱 Works on Any Device
- Looks great on phones, tablets, and computers
- Dark mode for night reading
- Fast loading times

---

## 🚀 Quick Start

**For Users:** Just visit the website and start reading news!

**For Developers:**
```bash
npm install      # Install dependencies
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Check code quality
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development guide.

------

## For Developers

### What's Under the Hood?

**Technology:**
- React (JavaScript framework for building the website)
- Vite (makes the site load super fast)
- RSS feeds (how we get news from 120+ sources for free)
- Netlify (where the website is hosted - it's free!)

**Key Features:**
- No database needed - everything loads directly from news sources
- Smart caching - news updates every 5 minutes
- Enhanced filtering - sports news shows only sports content, not politics
- Completely free to run - no API costs

---

## 🚀 How to Set This Up (For Developers)

### 1. Download the Code
```bash
git clone https://github.com/yourusername/TheLatest.git
cd TheLatest
```

### 2. Install Required Software
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev:netlify
```

Visit: **http://localhost:52678**

### 4. Deploy to the Internet (Optional)
```bash
netlify deploy --prod
```

That's it! Your news site is now live on the internet.

---

## 📖 How It Works

### RSS Feeds - The Secret Sauce
Instead of paying for expensive news APIs, TheLatest uses RSS feeds - a free technology that news sites provide to share their content. We've configured 120+ RSS feeds from sources like:
- CNN, BBC, New York Times (news)
- ESPN, Sports Illustrated (sports)
- TechCrunch, The Verge (tech)
- Variety, Hollywood Reporter (entertainment)

### The Flow:
1. User visits your site
2. Site requests latest articles from RSS feeds
3. Articles are cached for 5 minutes
4. Content is filtered by category and keywords
5. Beautiful page displays with all the news

### Smart Filtering:
When you're on the Sports page, the system:
- Fetches all sports RSS feeds
- Filters opinions/videos/podcasts using sports keywords (NFL, NBA, etc.)
- Requires multiple keyword matches to avoid showing political "team" talk
- Shows only genuinely sports-related content

---

## 🎯 Category Configuration

Each category has 70-90 carefully selected keywords to ensure relevant content:

**Sports:** NFL, NBA, MLB, hockey, soccer, Olympics, playoffs, championships
**Entertainment:** Oscars, Emmys, movies, music, celebrities, Hollywood
**Business & Tech:** Startups, AI, stocks, Apple, Google, cryptocurrency
**Lifestyle:** Health, travel, food, fitness, fashion
**Culture:** Arts, museums, literature, books, theatre

---

## 📱 Mobile-Friendly Design

Works perfectly on:
- iPhones and Android phones
- iPads and tablets  
- Desktop computers
- Works in both portrait and landscape mode
- Automatically adjusts text size for readability

---

## 🛠️ Tech Stack

**Frontend:**
- React 18 (for building the user interface)
- React Router (for page navigation)
- Axios (for fetching news data)
- FontAwesome (for icons)

**Backend:**
- Netlify Functions (serverless - no server to maintain!)
- RSS Parser (reads news feeds)
- Node.js (JavaScript runtime)

**Deployment:**
- Netlify (free hosting)
- GitHub (code storage)
- Automatic deployments when you push code

---

## 📦 Project Structure

```
TheLatest/
├── src/
│   ├── pages/           # Different pages (HomePage, CategoryPage, etc.)
│   ├── components/      # Reusable pieces (Header, Footer, etc.)
│   │   ├── layout/      # Header and Footer
│   │   └── sections/    # News sections (TopStories, Videos, etc.)
│   ├── utils/           # Helper functions and utilities
│   ├── services/        # API services and data fetching
│   ├── context/         # React Context for state management
│   ├── hooks/           # Custom React hooks
│   ├── assets/          # Images and fonts
│   └── main.jsx         # App entry point
├── public/              # Static files (images, fonts)
├── netlify/             # Netlify serverless functions
├── package.json         # Dependencies list
└── netlify.toml         # Deployment configuration
```

### Utilities (`src/utils/`) - Helper Functions for Common Tasks

These utility files provide reusable functions used throughout the application:

#### **`cacheManager.js`**
- **Purpose:** Manages persistent data caching using IndexedDB
- **Features:** 
  - Stores news, opinions, videos, and podcasts for 10 minutes
  - Automatically clears expired cache entries
  - 10x larger storage than localStorage (IndexedDB vs 5MB limit)
  - Graceful fallback if cache fails
- **Used By:** newsService.js to reduce API calls and improve performance
- **Key Functions:** 
  - `get(key)` - Retrieve cached data
  - `set(key, value)` - Store data with timestamp
  - `clear()` - Remove all cache entries

#### **`categoryFiltering.js`** ⭐ *NEW*
- **Purpose:** Intelligent content filtering based on category keywords
- **Features:**
  - Comprehensive keyword lists for all categories (70-100+ keywords each)
  - Filters news, opinions, videos, and podcasts by category
  - Configurable minimum keyword matches threshold
  - Consistent filtering logic used across all pages
  - Categories: top-stories, business-tech, entertainment, sports, lifestyle, culture
- **Used By:** AllNewsPage, AllOpinionsPage, AllVideosPage, AllPodcastsPage, CategoryPage
- **Key Functions:**
  - `filterContentByCategory(items, categoryName, minMatches)` - Filter array of content
  - `getCategoryKeywords(categoryName)` - Get keywords for a category
  - `belongsToCategory(item, categoryName)` - Check if item belongs to category
- **Example Usage:**
  ```javascript
  import { filterContentByCategory } from '../utils/categoryFiltering';
  const businessNews = filterContentByCategory(allNews, 'business-tech', 1);
  // Returns articles containing any business/tech keywords
  ```

#### **`categoryConfig.js`** ⭐ *NEW*
- **Purpose:** Centralized configuration for all category pages
- **Features:**
  - Defines titles, subtitles, and AI prompts for each category
  - Provides dynamic category names for page headers
  - Currently configured categories: top-stories, business-tech, entertainment, sports, lifestyle, culture
  - Easy to extend for new categories
- **Used By:** AllNewsPage, AllOpinionsPage, AllVideosPage, AllPodcastsPage
- **Key Functions:**
  - `getCategoryConfig(categoryName)` - Get full config for a category
  - `getCategoryNameFormatted(categoryName)` - Get formatted display name
- **Example Usage:**
  ```javascript
  const categoryConfig = getCategoryConfig('business-tech');
  // Returns: { title: 'Business & Tech', newsTitle: 'Top Business & Tech Stories', ... }
  ```

#### **`imageUtils.js`**
- **Purpose:** Robust image handling with a three-tier cascading fallback chain to prevent broken/missing images
- **Fallback chain order:**
  1. **Real article image** — `og:image` / `twitter:image` extracted directly from the article HTML by the RSS aggregator
  2. **Unsplash category photo** — curated, category-specific photo via the Unsplash source API
  3. **Picsum seeded photo** — deterministic random photo (`picsum.photos/seed/{seed}/1200/800`) seeded from the article title so the same article always shows the same image across refreshes
- **Features:**
  - `isValidImageUrl()` accepts CDN subdomains (`cdn.*`, `images.*`, `media.*`) and data URIs; blocks known tracker/ad pixel patterns (`1x1`, `pixel`, `tracker`, etc.)
  - `data-fallback-seed` attribute on every `<img>` powers seed-based determinism in the final fallback
- **Used By:** Any component displaying article/content images
- **Key Functions:**
  - `getImageProps(src, alt, category)` — returns `{ src, alt, onError, loading, decoding, data-fallback-seed }` props
  - `handleImageError(event, category)` — two-step fallback handler (Unsplash → picsum)
  - `getFallbackImage(category)` — returns Unsplash URL for the given category
  - `getPhotoFallback(category, seedText)` — returns deterministic picsum URL

#### **`fuzzySearch.js`**
- **Purpose:** Provides fuzzy matching for search suggestions and typo correction
- **Features:**
  - Levenshtein distance algorithm for string similarity
  - Suggests corrections for misspelled search terms
  - 60%+ similarity threshold to avoid incorrect suggestions
  - Pre-built common keywords for politics, sports, tech, etc.
- **Used By:** Search functionality and autocorrect features
- **Key Functions:**
  - `levenshteinDistance(str1, str2)` - Calculate string similarity
  - `findClosestMatch(searchTerm, keywords)` - Find best matching keyword
- **Example:** Typing "tecnology" suggests "technology"

#### **`topicImages.js`**
- **Purpose:** Topic-to-image mapping for AI Summary headlines
- **Features:**
  - Maps 50+ topics to relevant Unsplash images
  - Includes sports teams, politicians, companies, events, etc.
  - Improves visual appeal of AI-generated summaries
  - Category-based image selection (politics, sports, tech, entertainment, etc.)
- **Used By:** AISummary component for headline images
- **Example Mappings:**
  - "oscars" → red carpet ceremony image
  - "ai" → technology/AI concept image
  - "soccer" → soccer field image
  - "bitcoin" → cryptocurrency image

---

## 🔧 Services (`src/services/`) - Data Fetching & API Integration

#### **`socialMediaApiService.js`**
- Handles social media API calls and integrations
- Manages connections to Twitter, Instagram, LinkedIn
- Formats social media posts for display

#### **`aiService.js`**
- Integrates with AI APIs for news summarization
- Processes today's top stories
- Generates concise summaries for quick reading

---

## 🎯 Hooks (`src/hooks/`) - React Hooks for Reusable Logic

#### **`useInfiniteScroll.js`**
- Handles infinite scroll pagination
- Automatically loads more articles when user scrolls to bottom
- Used on news feed and category pages

---

## 🌍 Context (`src/context/`) - Global State Management

#### **`SearchContext.jsx`**
- Manages global search state
- Tracks active topic/filter across pages
- Allows cross-page search persistence

---

## ✨ Recent Updates & Progress (March 2026)

### Intelligent Content Filtering System ⭐
- **File:** `src/utils/categoryFiltering.js`
- **Problem solved:** Category pages showed 0 articles or cross-contaminated posts (e.g. general news appearing on the Sports page)
- **Solution:** Keyword-based filtering with 70–100+ keywords per category, alias resolution (`tech` → `business-tech`), and a strict mode that returns an empty array rather than silently falling back to unfiltered content
- **All category pages** (`/category/*`) and **all "See More" pages** (`/category/*/all-news` etc.) pass `{ strict: true }` to ensure only on-topic content reaches the user

### Real Article Image Extraction
- **File:** `netlify/functions/rss-aggregator.js`
- **How it works:** After fetching RSS feeds, `enrichItemsWithArticleImages()` runs on every item that lacks a valid image — it fetches the article HTML and reads `og:image` / `twitter:image` meta tags
- **Concurrency:** batches of 6 parallel requests, up to 60 items per feed fetch
- **Screenshot fallback:** if meta extraction fails, `getArticlePreviewImage()` returns a `thum.io` screenshot URL for the article
- **In-memory cache:** `articleImageCache` (Map, 6-hour TTL) avoids re-fetching the same article page on repeated requests

### Article Deduplication
- **File:** `netlify/functions/rss-aggregator.js`
- Fingerprint: `url:{normalizedUrl}` or `title:{source}|{headline}` (for items without a canonical URL)
- Quality scoring (`scoreItemQuality`) picks the best copy of a duplicate based on URL presence, description length, image quality, and recency
- `mergeItems(primary, secondary)` preserves the best fields from both copies before discarding the weaker one

### Dynamic Category Page Titles
- **File:** `src/utils/categoryConfig.js`
- Category pages and "See More" pages now show titles like **"Top Business & Tech Stories"** instead of the generic "All News"
- `getCategoryConfig(categoryName)` returns `{ title, newsTitle, subtitle, aiPrompt, image }` for every registered category

### Performance & Code Splitting ⭐
See the full [Performance Architecture](#-performance-architecture) section below.

### Currently Supported Categories

| Slug | Display Name |
|---|---|
| `top-stories` | Top Stories |
| `business-tech` | Business & Tech |
| `entertainment` | Entertainment |
| `sports` | Sports |
| `lifestyle` | Lifestyle |
| `culture` | Culture |

---

## ⚡ Performance Architecture

This section explains every performance optimisation active in the codebase so contributors understand *why* the code is structured the way it is.

### Route-Level Code Splitting (`src/App.jsx`)

Every page component is loaded with `React.lazy()` and wrapped in a `<Suspense>` boundary:

```jsx
// App.jsx
const CategoryPage  = lazy(() => import('./pages/CategoryPage'))
const AllNewsPage   = lazy(() => import('./pages/AllNewsPage'))
// ... all 14 page imports are lazy

<Suspense fallback={<RouteLoader />}>
  <Routes>...</Routes>
</Suspense>
```

A visitor landing on the home page downloads *only* the code needed to render that page. The CategoryPage, SearchResults, AllNewsPage, etc. chunks are only fetched when the user navigates there.

> **Rule for contributors:** Any new full-page component added to `<Routes>` in `App.jsx` **must** use `React.lazy()`. Direct eager `import` for page-level components is not allowed.

### Vite Chunk Strategy (`vite.config.js`)

The `manualChunks` function groups modules into long-term-cacheable buckets:

| Chunk | Contents | Change Frequency |
|---|---|---|
| `react-vendor` | react, react-dom | Almost never |
| `router` | react-router-dom | Rarely |
| `icons` | @fortawesome/* | Rarely |
| `axios` | axios | Rarely |
| `vendor` | remaining node_modules | Occasionally |
| `page-category` | CategoryPage + sub-components | Per feature |
| `pages-all` | AllNews/Opinions/Videos/Podcasts | Per feature |
| `pages-misc` | SearchResults, FollowingPage | Per feature |

Because `react-vendor` almost never changes, returning visitors get it straight from the browser cache — it is never re-downloaded unless React itself is upgraded. CSS code splitting (`cssCodeSplit: true`) ensures each lazy page only fetches its stylesheet when first visited.

### Below-the-Fold Lazy Rendering (`TrendingStories.jsx`)

`TrendingStories` uses `IntersectionObserver` so its list DOM is not created until the section scrolls within 200 px of the viewport:

```jsx
const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
  },
  { rootMargin: '200px 0px' }  // pre-load 200px before the user sees it
);
observer.observe(sectionRef.current);
```

While off-screen, animated **skeleton rows** are rendered so the layout does not shift when real content arrives. The component is wrapped in `React.memo` to skip re-renders when the parent re-renders with identical `stories` / `loading` props.

> **Pattern to follow:** Any heavy section that lives below the fold (Podcasts, Videos, Opinions sliders) should adopt the same `IntersectionObserver` + skeleton approach.

### Section-Level Code Splitting (`src/pages/HomePage.jsx`)

Sections that only appear below the fold are lazy-imported inside `HomePage`:

```jsx
const AISummary   = lazy(() => import('../components/sections/AISummary'))
const SocialMedia = lazy(() => import('../components/sections/SocialMedia'))
const Opinions    = lazy(() => import('../components/sections/Opinions'))
const Videos      = lazy(() => import('../components/sections/Videos'))
const Podcasts    = lazy(() => import('../components/sections/Podcasts'))
const Search      = lazy(() => import('../components/sections/Search'))
```

### IndexedDB Caching (`src/utils/cacheManager.js` + `src/rssService.js`)

- News, opinions, videos, and podcasts are cached in **IndexedDB** (not localStorage — 10× the storage quota) for 10 minutes
- Cache keys are **versioned** (`v2-images` prefix in `rssService.js`) — bumping the version forces all clients to discard stale cached data and re-fetch
- Each fetch function accepts an optional `category` param so per-category data is cached independently from the global feed

```js
// rssService.js
const RSS_CACHE_VERSION = 'v2-images';
const getVersionedCacheKey = (type, category = null) =>
  `${RSS_CACHE_VERSION}_${category ? `${type}_${category}` : type}`;
```

> **When to bump the cache version:** Any time the RSS aggregator changes the shape of returned objects, or image/enrichment logic changes in a way that makes old cache entries stale.

### Minification (`vite.config.js`)

- Uses Vite's built-in **esbuild** minifier — no extra dependency, faster than terser
- `esbuild.drop: ['console', 'debugger']` strips all console calls and debugger statements from the production bundle
- Build target: `es2020` — modern syntax, smaller output, no IE/legacy polyfill overhead

### Contributing Guide for Utilities

**To add a new utility:**
1. Create `src/utils/[name].js`
2. Add JSDoc comments
3. Use named exports (not default exports)
4. Document under the Utilities section in this README

**To add a new category:**
1. Add entry to `CATEGORY_CONFIG` in `categoryConfig.js` — provide `title`, `newsTitle`, `subtitle`, `aiPrompt`, `image`
2. Add the keyword list to `CATEGORY_KEYWORDS` in `categoryFiltering.js` (aim for 70+ keywords)
3. Add the route to `App.jsx` using `React.lazy`
4. Update the supported categories table above

---

## 🚧 Roadmap & Future Features

- [ ] Add Wikipedia to Advanced Search
- [ ] Improve story layout with ads space
- [ ] Larger text for story descriptions
- [ ] Optimize image sizes to prevent pixelation
- [ ] User accounts & saved articles
- [ ] Newsletter signup integration
- [ ] More news categories

---

## 📝 Common Commands

```bash
# Start development server
npm run dev:netlify

# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod

# Check for errors
npm run lint
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to the branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

### Areas Where You Can Contribute:
- Add more RSS feeds from international sources
- Improve the UI/UX design
- Add new features (user accounts, bookmarks, etc.)
- Fix bugs and improve performance
- Translate the site to other languages
- Write tests

---

## 📄 License

This project is open source and available under the MIT License.

---

## 💬 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/shelovesczar/TheLatest/issues)
- **Discussions**: [Join the conversation](https://github.com/shelovesczar/TheLatest/discussions)
- **Organization**: Part of [Our National Conversations](https://github.com/ournationalconversations)

---

## 🎉 Credits & Acknowledgments

Built with ❤️ by Cesar Hernandez and contributors.

**Technology Stack:**
- React + Vite
- RSS Feed Aggregation
- Netlify Serverless Functions
- FontAwesome Icons

**News Sources:** CNN, BBC, Al Jazeera, ESPN, TechCrunch, Variety, and 165+ more trusted publications worldwide.

**Special Thanks:**
- All contributors and testers
- Open source community
- News organizations providing RSS feeds

---

## 🔗 Useful Links

- [Live Demo](#) _(Add your Netlify URL here)_
- [README - Project Overview](./README.md)
- [CONTRIBUTING - Developer Guide](./CONTRIBUTING.md) ⭐ **Start here if you want to contribute!**
- [Git Upload Guide](./GIT_UPLOAD_GUIDE.md)
- [Social Media Guide](./SOCIAL_MEDIA_GUIDE.md)
- [RSS Implementation Guide](./RSS_IMPLEMENTATION.md)
- [Performance Optimization Tips](./PERFORMANCE_OPTIMIZATION.md)

---

## 🛠️ Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## 🐳 Docker Commands Reference

```bash
# Build development image
docker-compose build dev

# Build production image
docker-compose build prod

# Stop running containers
docker-compose down

# View logs
docker-compose logs -f

# Remove all containers and images
docker-compose down --rmi all
```
