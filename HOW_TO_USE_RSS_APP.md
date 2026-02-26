# How to Use RSS.app with Your Site

## Step 1: Get RSS Feed URLs from RSS.app

Looking at your RSS.app account, you have several feed categories:

### Your Current Feeds:
- **CNBC** - Business/Finance news
- **NPR News** - General news
- **Guardian** - International news
- **Al Jazeera English** - World news
- **Reuters** - Breaking news
- **westsidecurrent.com** - Local news
- **Homepage - Brentwood News** - Local news
- And more...

### To Get Feed URLs:

1. **In RSS.app**, click on any feed (e.g., "CNBC")
2. Look for the **RSS feed URL** - it should look like:
   ```
   https://rss.app/feeds/[unique-id].xml
   ```
3. **Copy that URL** for each feed you want to use

## Step 2: Add RSS.app Feeds to Your Site

Open [netlify/functions/rss-aggregator.js](netlify/functions/rss-aggregator.js) and add your RSS.app feeds:

```javascript
// RSS Feed Sources
const RSS_FEEDS = {
  news: [
    // Your existing feeds
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'New York Times' },
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News' },
    
    // ADD YOUR RSS.APP FEEDS HERE:
    { url: 'https://rss.app/feeds/YOUR-CNBC-ID.xml', source: 'CNBC' },
    { url: 'https://rss.app/feeds/YOUR-NPR-ID.xml', source: 'NPR' },
    { url: 'https://rss.app/feeds/YOUR-GUARDIAN-ID.xml', source: 'Guardian' },
    { url: 'https://rss.app/feeds/YOUR-ALJAZEERA-ID.xml', source: 'Al Jazeera' },
    { url: 'https://rss.app/feeds/YOUR-REUTERS-ID.xml', source: 'Reuters' }
  ],
  
  // You can organize by category
  local: [
    { url: 'https://rss.app/feeds/YOUR-WESTSIDE-ID.xml', source: 'Westside Current' },
    { url: 'https://rss.app/feeds/YOUR-BRENTWOOD-ID.xml', source: 'Brentwood News' }
  ]
};
```

## Step 3: Filter Out Unwanted Links/Content

I've added a **filter system** to the RSS aggregator. You can filter by:

### 1. **Exclude Specific Domains**
Add domains you want to block:

```javascript
const FILTER_CONFIG = {
  excludeDomains: [
    'spam-site.com',
    'unwanted-news.com',
    'tabloid-garbage.net'
  ]
};
```

### 2. **Exclude Keywords**
Filter articles containing specific words:

```javascript
const FILTER_CONFIG = {
  excludeKeywords: [
    'sponsored',
    'advertisement',
    'promoted content',
    'press release',
    'breaking:',  // If you don't want "breaking" news
    'celebrity',  // Filter celebrity gossip
    'kardashian'  // Specific topics
  ]
};
```

### 3. **Minimum Title Length**
Prevent spam with short titles:

```javascript
const FILTER_CONFIG = {
  minTitleLength: 20  // Titles must be at least 20 characters
};
```

### 4. **URL Pattern Filtering**
Block articles with certain URL patterns:

```javascript
const FILTER_CONFIG = {
  excludeUrlPatterns: [
    /\/ads?\//i,           // URLs with /ad/ or /ads/
    /\/sponsored\//i,      // URLs with /sponsored/
    /\/promotion\//i,      // URLs with /promotion/
    /clickbait/i,          // URLs with "clickbait"
    /\?utm_source=/i       // Tracking parameters
  ]
};
```

## Step 4: Example - Filter Out Specific Content

### Example 1: Block All Celebrity News
```javascript
const FILTER_CONFIG = {
  excludeKeywords: [
    'celebrity',
    'kardashian',
    'kanye',
    'taylor swift',
    'hollywood gossip',
    'red carpet'
  ]
};
```

### Example 2: Block Sponsored Content
```javascript
const FILTER_CONFIG = {
  excludeDomains: [
    'contentads.net',
    'promo-site.com'
  ],
  excludeKeywords: [
    'sponsored',
    'advertisement',
    'partner content',
    'promoted by'
  ],
  excludeUrlPatterns: [
    /\/sponsored\//i,
    /\/ads?\//i,
    /\?sponsored=/i
  ]
};
```

### Example 3: Only Show Serious News (No Entertainment)
```javascript
const FILTER_CONFIG = {
  excludeKeywords: [
    'kardashian',
    'celebrity',
    'reality tv',
    'tiktok',
    'viral video',
    'funny',
    'meme'
  ],
  minTitleLength: 30  // Longer titles = more serious
};
```

## Step 5: Current Filter Configuration

Your [rss-aggregator.js](netlify/functions/rss-aggregator.js) now has this filter setup:

```javascript
const FILTER_CONFIG = {
  excludeDomains: [
    'example-spam-site.com',
    'unwanted-domain.com'
    // Add domains to block here
  ],
  
  excludeKeywords: [
    'sponsored',
    'advertisement',
    'promoted content',
    'press release'
    // Add keywords to block here
  ],
  
  minTitleLength: 20,
  
  excludeUrlPatterns: [
    /\/ads?\//i,
    /\/sponsored\//i,
    /\/promotion\//i
  ]
};
```

**To customize**: Just edit the arrays above with domains, keywords, or patterns you want to filter out.

## Step 6: Test Your Filters

After adding filters:

1. **Save the file**
2. **Deploy to Netlify**:
   ```bash
   git add .
   git commit -m "Add RSS.app feeds and content filtering"
   git push
   ```
3. **Check the logs**:
   - Open browser console (F12)
   - Look for messages like: `"Filtered out: [article title] (keyword: celebrity)"`
   - This shows what's being filtered

## Step 7: Advanced RSS.app Features

### Use RSS.app's Built-in Filtering

RSS.app also has its own filtering! You can:

1. **In RSS.app dashboard**:
   - Click on a feed
   - Go to "Filter & Sort" settings
   - Add **include/exclude rules**
   - Filter by keywords, sources, dates

2. **Benefits of RSS.app filtering**:
   - Filters happen BEFORE your site fetches the feed
   - Reduces bandwidth
   - Cleaner data from the start

3. **Example RSS.app filters**:
   - Exclude: `sponsored, advertisement, press release`
   - Include: `breaking, exclusive, investigation`
   - Date: `only last 24 hours`

## Step 8: Combine Both Filtering Methods

**Best Practice**: Use BOTH filtering systems:

1. **RSS.app filtering** (first line of defense):
   - Filter out obvious spam/ads
   - Set date ranges
   - Include only specific topics

2. **Your site's filtering** (second line of defense):
   - Fine-tune what gets displayed
   - Handle edge cases
   - Customize per category

### Example Workflow:

**In RSS.app**:
- Exclude: `"sponsored", "advertisement"`
- Only include articles from last 48 hours

**In your rss-aggregator.js**:
```javascript
const FILTER_CONFIG = {
  excludeKeywords: [
    'celebrity',      // Extra filters
    'viral video',
    'tiktok'
  ],
  minTitleLength: 25  // Quality control
};
```

## Step 9: Common Filter Patterns

### Block Politics:
```javascript
excludeKeywords: ['trump', 'biden', 'election', 'congress', 'senate', 'republican', 'democrat']
```

### Block Sports:
```javascript
excludeKeywords: ['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'sports']
```

### Only Technology News:
```javascript
// In RSS.app, create a "Technology" feed bundle
// Then filter out non-tech keywords:
excludeKeywords: ['politics', 'celebrity', 'sports', 'entertainment']
```

### Block Clickbait:
```javascript
excludeKeywords: [
  'you won\'t believe',
  'shocking',
  'must see',
  'goes viral',
  'breaks internet',
  'slams',
  'destroys',
  'epic fail'
],
excludeUrlPatterns: [
  /clickbait/i,
  /viral/i
]
```

## Step 10: Monitor Your Filters

Check how many articles are being filtered:

1. **Open browser console** (F12)
2. **Look for logs**:
   ```
   CNBC: 50 total, 42 after filtering (8 filtered out)
   NPR: 30 total, 30 after filtering (0 filtered out)
   Guardian: 45 total, 38 after filtering (7 filtered out)
   ```

3. **Adjust filters** if:
   - Too many filtered out → loosen filters
   - Still seeing spam → tighten filters

## Quick Reference

### Add RSS.app Feed:
```javascript
{ url: 'https://rss.app/feeds/[YOUR-ID].xml', source: 'Feed Name' }
```

### Block Domain:
```javascript
excludeDomains: ['domain.com']
```

### Block Keyword:
```javascript
excludeKeywords: ['keyword']
```

### Block URL Pattern:
```javascript
excludeUrlPatterns: [/pattern/i]
```

## Need Help?

**Common Issues**:

1. **Feed not loading**: Check the RSS.app URL is correct
2. **Too much filtered**: Reduce keywords in `excludeKeywords`
3. **Still seeing spam**: Add more specific keywords/domains
4. **Slow loading**: Reduce number of feeds (keep under 20 total)

**Testing**:
```bash
# Test locally
netlify dev

# Check RSS endpoint
http://localhost:8888/.netlify/functions/rss-aggregator?type=news
```

Your RSS.app integration is ready to go! 🎉
