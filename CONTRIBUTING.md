# Contributing Guide

Thank you for your interest in contributing to TheLatest! This guide explains how the project is structured and how to add new features.

## 📋 Table of Contents

- [Project Architecture](#project-architecture)
- [Understanding Utilities](#understanding-utilities)
- [Working with Categories](#working-with-categories)
- [Adding New Features](#adding-new-features)
- [Common Tasks](#common-tasks)

---

## 🎯 Project Architecture

TheLatest uses a modular, component-based architecture:

```
src/
├── pages/          - Full page components (AllNewsPage, CategoryPage, etc.)
├── components/     - Reusable UI components
│   ├── common/     - Generic components (NewsCard, AdBreak, etc.)
│   ├── layout/     - Header, Footer, Navigation
│   └── sections/   - Content sections (TopStories, Videos, Opinions, etc.)
├── services/       - API calls and data fetching (socialMediaApiService, aiService)
├── utils/          - Helper functions (cacheManager, imageUtils, etc.) ⭐
├── context/        - React Context for global state (SearchContext)
├── hooks/          - Custom React hooks (useInfiniteScroll)
└── App.jsx         - Main app with routing
```

---

## 🔧 Understanding Utilities

Utilities are **helper functions** that solve specific problems and can be used anywhere in the app.

### Current Utilities:

1. **`cacheManager.js`** - Store/retrieve data from IndexedDB (10-minute cache)
2. **`categoryConfig.js`** - Configuration for category pages (titles, subtitles, prompts)
3. **`categoryFiltering.js`** - Keyword-based content filtering by category
4. **`imageUtils.js`** - Image loading with fallbacks
5. **`fuzzySearch.js`** - Typo correction and fuzzy matching
6. **`topicImages.js`** - Topic-to-image mapping

### How to Add a New Utility:

**Example: Creating `src/utils/dateFormatter.js`**

```javascript
/**
 * Date formatting utilities
 * Provides consistent date formatting across the app
 */

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type: 'short', 'long', 'relative'
 * @returns {string} Formatted date
 */
export function formatDate(date, format = 'short') {
  const d = new Date(date);
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    case 'long':
      return d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'relative':
      return getRelativeTime(d);
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {Date} date - Date to convert
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
```

**Then use it in a component:**

```javascript
import { formatDate } from '../utils/dateFormatter';

function NewsCard({ article }) {
  return (
    <div>
      <h2>{article.title}</h2>
      <span>{formatDate(article.publishedAt, 'relative')}</span>
    </div>
  );
}
```

### Best Practices for Utilities:

✅ **DO:**
- Add JSDoc comments explaining what the function does
- Include examples in comments
- Export multiple related functions (not a single default export)
- Keep functions pure (same input = same output)
- Handle edge cases (null, undefined, empty strings)
- Document all parameters and return values

❌ **DON'T:**
- Mix unrelated utilities in one file
- Import heavy dependencies without considering performance
- Use global state directly (pass as parameters)
- Create utilities that only work for one component (keep in component instead)

---

## 🏷️ Working with Categories

Categories are managed through `categoryConfig.js`. This allows consistent behavior across all category pages.

### Current Categories:

```javascript
{
  'top-stories': {
    title: 'Top Stories',
    newsTitle: 'Top Stories',
    subtitle: 'Breaking news...',
    aiPrompt: "today's top breaking news",
    image: 'https://...'
  },
  'business-tech': {
    title: 'Business & Tech',
    newsTitle: 'Top Business & Tech Stories',
    subtitle: 'Latest updates in business...',
    aiPrompt: 'business and technology news',
    image: 'https://...'
  }
  // ... more categories
}
```

### Adding a New Category:

**Step 1:** Add to `categoryConfig.js`

```javascript
export const CATEGORY_CONFIG = {
  'top-stories': { /* ... */ },
  'your-new-category': {
    title: 'Your New Category',
    newsTitle: 'Top Your New Category Stories',
    subtitle: 'Description of this category...',
    aiPrompt: 'AI prompt for summarization',
    image: 'https://images.unsplash.com/photo-...',
  }
}
```

**Step 2:** Add route in `App.jsx`

```javascript
<Route 
  path="/category/your-new-category" 
  element={
    <CategoryPage 
      category="your-new-category"
      email={email}
      setEmail={setEmail}
      handleSubscribe={handleSubscribe}
    />
  } 
/>
```

**Step 3:** Add keywords in `CategoryPage.jsx`

```javascript
'your-new-category': {
  title: 'Your New Category',
  keywords: ['keyword1', 'keyword2', 'keyword3'],
  sources: ['Source 1', 'Source 2']
}
```

**Step 4:** Update navigation in `App.jsx` or header to include the link

---

## 🚀 Adding New Features

### Typical Feature Steps:

1. **Identify where it belongs** (page, component, service, or utility)
2. **Create the code** with proper structure
3. **Document it** in README and JSDoc comments
4. **Test it** in the browser (`npm run dev`)
5. **Update docs** with any changes

### Example: Adding a "Save Article" Feature

**Step 1: Create a utility** (`src/utils/savedArticles.js`)

```javascript
/**
 * Saved articles management
 * Stores user's bookmarked articles in IndexedDB
 */

const STORE_NAME = 'savedArticles';

export async function saveArticle(article) {
  // Store article in IndexedDB
  // Return success/error
}

export async function getSavedArticles() {
  // Retrieve all saved articles
  // Return array of articles
}

export async function removeArticle(articleId) {
  // Delete article from storage
  // Return success/error
}
```

**Step 2: Create a component** (`src/components/common/SaveButton.jsx`)

```javascript
import { useState } from 'react';
import { saveArticle, removeArticle } from '../../utils/savedArticles';

export default function SaveButton({ article, onSave }) {
  const [isSaved, setIsSaved] = useState(false);

  const handleClick = async () => {
    if (isSaved) {
      await removeArticle(article.id);
    } else {
      await saveArticle(article);
    }
    setIsSaved(!isSaved);
    onSave?.();
  };

  return (
    <button onClick={handleClick} className="save-button">
      {isSaved ? '❤️ Saved' : '🤍 Save'}
    </button>
  );
}
```

**Step 3: Use in articles** (add to NewsCard component)

```javascript
import SaveButton from './SaveButton';

export default function NewsCard({ article }) {
  return (
    <article>
      <h2>{article.title}</h2>
      <SaveButton article={article} />
    </article>
  );
}
```

**Step 4: Document it** (add to README)

---

## 📝 Common Tasks

### Adding a New RSS Feed Source

Edit `CategoryPage.jsx` and add to the relevant category's `sources` array:

```javascript
'top-stories': {
  sources: [
    'Associated Press',
    'Reuters',
    'Your New Source' // Add here
  ]
}
```

### Modifying Category Keywords

Keywords determine which articles appear in each category. Edit `CategoryPage.jsx`:

```javascript
'sports': {
  keywords: [
    // Add new keywords here
    'your-new-keyword',
    'another-keyword'
  ]
}
```

### Creating a New Page

1. Create file: `src/pages/MyNewPage.jsx`
2. Import in `App.jsx`: `import MyNewPage from './pages/MyNewPage'`
3. Add route in `App.jsx`:
```javascript
<Route path="/my-new-page" element={<MyNewPage />} />
```
4. Add navigation link in Header or Menu

### Styling a New Component

Create corresponding CSS file:
- Component: `src/components/MyComponent.jsx`
- Styles: `src/components/MyComponent.css`

Import in component: `import './MyComponent.css'`

---

## 🧪 Testing

Before pushing changes:

1. **Test locally:**
   ```bash
   npm run dev
   ```

2. **Check for errors:**
   ```bash
   npm run lint
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Test the build:**
   ```bash
   npm run preview
   ```

---

## 📚 Useful Resources

- [React Documentation](https://react.dev)
- [React Router Guide](https://reactrouter.com)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [RSS Feeds Explained](https://www.whatiserss.com/)

---

## 💡 Need Help?

- Check existing utilities and components for examples
- Read the README.md for architecture overview
- Open a GitHub Issue if you have questions
- Join discussions for feature ideas

---

## 🎉 Thank You!

Your contributions make TheLatest better. Thank you for helping!
