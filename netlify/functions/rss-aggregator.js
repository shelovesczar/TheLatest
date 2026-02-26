const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 30000, // Increased to 30 seconds
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'thumbnail'],
      ['description', 'description'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

// In-memory cache (lasts for function lifetime)
let cache = {
  news: { data: null, timestamp: 0 },
  opinions: { data: null, timestamp: 0 },
  videos: { data: null, timestamp: 0 },
  podcasts: { data: null, timestamp: 0 }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Filter Configuration - Add domains or keywords to exclude
const FILTER_CONFIG = {
  // Domains to exclude (exact match or contains)
  excludeDomains: [
    'example-spam-site.com',
    'unwanted-domain.com'
    // Add more domains here
  ],
  
  // Keywords to exclude from titles or descriptions
  excludeKeywords: [
    'sponsored',
    'advertisement',
    'promoted content',
    'press release'
    // Add more keywords here
  ],
  
  // Minimum title length (to filter out spam/short titles)
  minTitleLength: 20,
  
  // Exclude articles with these patterns in URLs
  excludeUrlPatterns: [
    /\/ads?\//i,
    /\/sponsored\//i,
    /\/promotion\//i
  ]
};

// Helper to strip HTML tags and decode entities
function stripHtml(html) {
  if (!html) return '';
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');
  
  // Decode common HTML entities
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&mdash;': '-',
    '&ndash;': '-',
    '&hellip;': '...',
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"'
  };
  
  Object.keys(entities).forEach(entity => {
    text = text.replace(new RegExp(entity, 'g'), entities[entity]);
  });
  
  // Handle numeric entities
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  text = text.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Filter function to exclude unwanted articles
function shouldFilterOut(item) {
  const title = (item.title || '').toLowerCase();
  const description = (item.description || '').toLowerCase();
  const link = (item.link || '').toLowerCase();
  
  // Check title length
  if (title.length < FILTER_CONFIG.minTitleLength) {
    return true;
  }
  
  // Check for excluded domains
  for (const domain of FILTER_CONFIG.excludeDomains) {
    if (link.includes(domain.toLowerCase())) {
      console.log(`Filtered out: ${item.title} (excluded domain: ${domain})`);
      return true;
    }
  }
  
  // Check for excluded keywords
  for (const keyword of FILTER_CONFIG.excludeKeywords) {
    const keywordLower = keyword.toLowerCase();
    if (title.includes(keywordLower) || description.includes(keywordLower)) {
      console.log(`Filtered out: ${item.title} (keyword: ${keyword})`);
      return true;
    }
  }
  
  // Check for excluded URL patterns
  for (const pattern of FILTER_CONFIG.excludeUrlPatterns) {
    if (pattern.test(link)) {
      console.log(`Filtered out: ${item.title} (URL pattern: ${pattern})`);
      return true;
    }
  }
  
  return false;
}

// RSS Feed Sources
const RSS_FEEDS = {
  news: [
    // Major News Networks
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'New York Times' },
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News' },
    { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian' },
    { url: 'http://rss.cnn.com/rss/cnn_topstories.rss', source: 'CNN' },
    { url: 'https://feeds.reuters.com/reuters/topNews', source: 'Reuters' },
    { url: 'https://feeds.npr.org/1001/rss.xml', source: 'NPR' },
    { url: 'https://www.politico.com/rss/politicopicks.xml', source: 'Politico' },
    { url: 'https://feeds.washingtonpost.com/rss/national', source: 'Washington Post' },
    { url: 'https://www.latimes.com/world-nation/rss2.0.xml', source: 'LA Times' },
    { url: 'http://feeds.foxnews.com/foxnews/latest', source: 'Fox News' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml', source: 'New York Times US' },
    { url: 'https://www.theguardian.com/us-news/rss', source: 'The Guardian US' },
    
    // International News Sources (Global Expansion)
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
    { url: 'https://rss.dw.com/xml/rss-en-all', source: 'Deutsche Welle' },
    { url: 'https://www.france24.com/en/rss', source: 'France 24' },
    { url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', source: 'Channel NewsAsia' },
    { url: 'https://www.scmp.com/rss/91/feed', source: 'South China Morning Post' },
    { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', source: 'Times of India' },
    { url: 'https://www.thestar.com.my/rss/News/Latest/', source: 'The Star Malaysia' },
    { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', source: 'ABC News Australia' },
    { url: 'https://www.cbc.ca/cmlink/rss-topstories', source: 'CBC News' },
    
    // Additional US News
    { url: 'https://feeds.nbcnews.com/nbcnews/public/news', source: 'NBC News' },
    { url: 'https://feeds.abcnews.com/abcnews/topstories', source: 'ABC News' },
    { url: 'https://www.cbsnews.com/latest/rss/main', source: 'CBS News' },
    { url: 'https://www.usatoday.com/rss/', source: 'USA Today' },
    { url: 'https://nypost.com/feed/', source: 'New York Post' },
    { url: 'https://apnews.com/apf-topnews', source: 'Associated Press' },
    
    // RSS APP feeds (for more niche topics)
    { url: 'https://rss.app/feeds/tTWnpqRL1kY8uxZD.xml', source: 'CNN' },
    { url: 'https://rss.app/feeds/_iIjbt3XTnFFpU0Cv.xml', source: 'The Latest' }
  ],
  opinions: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Opinion.xml', source: 'New York Times Opinion' },
    { url: 'https://www.theguardian.com/uk/commentisfree/rss', source: 'The Guardian Opinion' },
    { url: 'https://www.theguardian.com/us/commentisfree/rss', source: 'The Guardian US Opinion' },
    { url: 'https://www.latimes.com/opinion/rss2.0.xml', source: 'LA Times Opinion' },
    // RSS APP feeds (for more niche topics)
    { url: 'https://rss.app/feeds/wGtHhwQaOwup8JQs.xml', source: 'New York Post' },
    { url: 'https://rss.app/feeds/_iIjbt3XTnFFpU0Cv.xml', source: 'The Latest' }
  ],
  videos: [
    // YouTube News Channels
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCupvZG-5ko_eiXAupbDfxWw', source: 'CNN' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCeY0bbntWzzVIaj2z3QigXg', source: 'NBC News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCXIJgqnII2ZOINSWNOGFThA', source: 'Fox News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCBi2mrWuNuyYy4gbM6fU18Q', source: 'ABC News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC16niRr50-MSBwiO3YDb3RA', source: 'BBC News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCaXkIU1QidjPwiAYu6GcHjg', source: 'MSNBC' },
    // RSS APP feeds
    { url: 'https://rss.app/feeds/wGtHhwQaOwup8JQs.xml', source: 'New York Post' },
    { url: 'https://rss.app/feeds/_iIjbt3XTnFFpU0Cv.xml', source: 'The Latest' }
  ],
  podcasts: [
    { url: 'https://feeds.npr.org/500005/podcast.xml', source: 'NPR Politics' },
    { url: 'https://feeds.megaphone.fm/NYT8938532588', source: 'The Daily (NYT)' },
    { url: 'https://feeds.megaphone.fm/WWO3519750118', source: 'Pod Save America' },
    { url: 'https://feeds.simplecast.com/54nAGcIl', source: 'The Ezra Klein Show' },
    // RSS APP feeds
    { url: 'https://rss.app/feeds/wGtHhwQaOwup8JQs.xml', source: 'New York Post' },
    { url: 'https://rss.app/feeds/_iIjbt3XTnFFpU0Cv.xml', source: 'The Latest' }
  ],
  sports: [
    // Major Sports Networks
    { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN' },
    { url: 'https://www.si.com/rss/si_topstories.rss', source: 'Sports Illustrated' },
    { url: 'https://www.cbssports.com/rss/headlines', source: 'CBS Sports' },
    { url: 'http://rss.cnn.com/rss/si_topstories.rss', source: 'Sports Illustrated CNN' },
    { url: 'https://www.latimes.com/sports/rss2.0.xml', source: 'LA Times Sports' },
    { url: 'https://www.espn.com/espn/rss/nfl/news', source: 'ESPN NFL' },
    { url: 'https://www.espn.com/espn/rss/nba/news', source: 'ESPN NBA' },
    { url: 'https://www.espn.com/espn/rss/mlb/news', source: 'ESPN MLB' },
    { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN Soccer' },
    { url: 'https://www.theguardian.com/sport/rss', source: 'The Guardian Sports' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/sports/rss.xml', source: 'NYT Sports' },
    
    // Additional Sports Sources
    { url: 'https://sports.yahoo.com/rss/', source: 'Yahoo Sports' },
    { url: 'https://bleacherreport.com/articles/feed', source: 'Bleacher Report' },
    { url: 'https://www.foxsports.com/rss', source: 'Fox Sports' },
    { url: 'https://www.nbcsports.com/feed', source: 'NBC Sports' },
    { url: 'https://www.espn.com/espn/rss/nhl/news', source: 'ESPN NHL' },
    { url: 'https://www.espn.com/espn/rss/golf/news', source: 'ESPN Golf' },
    { url: 'https://www.espn.com/espn/rss/tennis/news', source: 'ESPN Tennis' },
    
    // RSS APP feeds
    { url: 'https://rss.app/feeds/wGtHhwQaOwup8JQs.xml', source: 'New York Post' }
  ],
  tech: [
    // Major Tech Publications
    { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
    { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
    { url: 'https://www.wired.com/feed/rss', source: 'Wired' },
    { url: 'https://www.engadget.com/rss.xml', source: 'Engadget' },
    { url: 'https://arstechnica.com/feed/', source: 'Ars Technica' },
    { url: 'https://www.cnet.com/rss/news/', source: 'CNET' },
    { url: 'https://www.theverge.com/tech/rss/index.xml', source: 'The Verge Tech' },
    { url: 'https://mashable.com/feeds/rss/all', source: 'Mashable' },
    { url: 'https://www.recode.net/rss/index.xml', source: 'Recode' },
    { url: 'https://www.theguardian.com/technology/rss', source: 'The Guardian Tech' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/technology/rss.xml', source: 'NYT Technology' },
    { url: 'https://www.wsj.com/xml/rss/3_7455.xml', source: 'WSJ Tech' },
    { url: 'https://www.zdnet.com/news/rss.xml', source: 'ZDNet' },
    // RSS APP feeds
    { url: 'https://rss.app/feeds/wGtHhwQaOwup8JQs.xml', source: 'New York Post' }
  ],
  entertainment: [
    // Entertainment Publications
    { url: 'https://variety.com/feed/', source: 'Variety' },
    { url: 'https://ew.com/feed/', source: 'Entertainment Weekly' },
    { url: 'https://www.hollywoodreporter.com/feed/', source: 'Hollywood Reporter' },
    { url: 'https://deadline.com/feed/', source: 'Deadline' },
    { url: 'https://www.latimes.com/entertainment-arts/rss2.0.xml', source: 'LA Times Entertainment' },
    { url: 'https://www.theguardian.com/film/rss', source: 'The Guardian Film' },
    { url: 'https://www.theguardian.com/tv-and-radio/rss', source: 'The Guardian TV' },
    { url: 'https://www.theguardian.com/music/rss', source: 'The Guardian Music' },
    { url: 'https://www.rollingstone.com/feed/', source: 'Rolling Stone' },
    { url: 'https://pitchfork.com/rss/news/', source: 'Pitchfork' },
    { url: 'https://consequence.net/feed/', source: 'Consequence' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/arts/rss.xml', source: 'NYT Arts' },
    
    // Additional Entertainment Sources
    { url: 'https://www.billboard.com/feed/', source: 'Billboard' },
    { url: 'https://www.vulture.com/rss', source: 'Vulture' },
    { url: 'https://www.indiewire.com/feed/', source: 'IndieWire' },
    { url: 'https://www.avclub.com/rss', source: 'The A.V. Club' },
    { url: 'https://www.nme.com/feed', source: 'NME' },
    { url: 'https://www.metacritic.com/rss/movies', source: 'Metacritic Movies' },
    
    // RSS APP feeds
    { url: 'https://rss.app/feeds/NqNqG0vL6EpyGww2.xml', source: 'PJ Media' }
  ],
  business: [
    // Business & Finance
    { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg' },
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC' },
    { url: 'https://www.economist.com/rss', source: 'The Economist' },
    { url: 'https://www.ft.com/?format=rss', source: 'Financial Times' },
    { url: 'https://www.wsj.com/xml/rss/3_7014.xml', source: 'Wall Street Journal' },
    { url: 'https://feeds.fortune.com/fortune/headlines', source: 'Fortune' },
    { url: 'https://www.forbes.com/business/feed/', source: 'Forbes Business' },
    { url: 'https://www.reuters.com/business', source: 'Reuters Business' },
    { url: 'https://www.theguardian.com/business/rss', source: 'The Guardian Business' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/business/rss.xml', source: 'NYT Business' },
    { url: 'https://www.latimes.com/business/rss2.0.xml', source: 'LA Times Business' }
  ],
  lifestyle: [
    // Health & Wellness
    { url: 'https://www.health.com/syndication/feed', source: 'Health.com' },
    { url: 'https://rss.medicalnewstoday.com/featurednews.xml', source: 'Medical News Today' },
    { url: 'https://www.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC', source: 'WebMD' },
    { url: 'https://www.prevention.com/feed/', source: 'Prevention' },
    { url: 'https://www.shape.com/feed/', source: 'Shape' },
    { url: 'https://www.menshealth.com/rss/all.xml/', source: 'Men\'s Health' },
    { url: 'https://www.womenshealthmag.com/rss/all.xml/', source: 'Women\'s Health' },
    // Travel
    { url: 'https://www.travelandleisure.com/feed/', source: 'Travel + Leisure' },
    { url: 'https://www.cntraveler.com/feed/rss', source: 'Condé Nast Traveler' },
    { url: 'https://www.lonelyplanet.com/blog/feed/', source: 'Lonely Planet' },
    { url: 'https://www.nationalgeographic.com/travel/rss/', source: 'National Geographic Travel' },
    // Food & Cooking
    { url: 'https://www.bonappetit.com/feed/rss', source: 'Bon Appétit' },
    { url: 'https://www.foodnetwork.com/feeds/all-recipes.rss', source: 'Food Network' },
    { url: 'https://www.epicurious.com/services/rss/recipes', source: 'Epicurious' },
    { url: 'https://www.eater.com/rss/index.xml', source: 'Eater' },
    // Fashion & Style
    { url: 'https://www.vogue.com/feed/rss', source: 'Vogue' },
    { url: 'https://www.gq.com/feed/rss', source: 'GQ' },
    { url: 'https://www.elle.com/rss/all.xml/', source: 'Elle' },
    // Home & Design
    { url: 'https://www.architecturaldigest.com/feed/rss', source: 'Architectural Digest' },
    { url: 'https://www.hgtv.com/feeds/all-shows.rss', source: 'HGTV' },
    { url: 'https://www.realsimple.com/syndication/all', source: 'Real Simple' },
    // Lifestyle General
    { url: 'https://www.theguardian.com/lifeandstyle/rss', source: 'The Guardian Lifestyle' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/well/rss.xml', source: 'NYT Well' },
    { url: 'https://www.latimes.com/lifestyle/rss2.0.xml', source: 'LA Times Lifestyle' }
  ],
  culture: [
    // Arts & Culture
    { url: 'https://www.newyorker.com/feed/everything', source: 'The New Yorker' },
    { url: 'https://www.theatlantic.com/feed/all/', source: 'The Atlantic' },
    { url: 'https://www.smithsonianmag.com/rss/latest_articles/', source: 'Smithsonian Magazine' },
    { url: 'https://hyperallergic.com/feed/', source: 'Hyperallergic' },
    { url: 'https://www.artsy.net/rss/news', source: 'Artsy' },
    { url: 'https://www.theguardian.com/culture/rss', source: 'The Guardian Culture' },
    { url: 'https://www.theguardian.com/books/rss', source: 'The Guardian Books' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/books/rss.xml', source: 'NYT Books' },
    { url: 'https://lithub.com/feed/', source: 'Literary Hub' },
    { url: 'https://www.npr.org/rss/rss.php?id=1008', source: 'NPR Books' },
    { url: 'https://www.theparisreview.org/blog/feed/', source: 'Paris Review' },
    { url: 'https://www.latimes.com/entertainment-arts/books/rss2.0.xml', source: 'LA Times Books' }
  ]
};

// Helper to extract image from RSS item
function extractImage(item) {
  // Special handling for YouTube videos - extract video ID and construct thumbnail URL
  if (item.link && item.link.includes('youtube.com/watch')) {
    const videoIdMatch = item.link.match(/[?&]v=([^&]+)/);
    if (videoIdMatch && videoIdMatch[1]) {
      // Use high quality thumbnail (maxresdefault), fall back to medium quality if not available
      return `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`;
    }
  }
  
  // Check iTunes podcast image (common in podcast feeds)
  if (item.itunes && item.itunes.image) {
    if (typeof item.itunes.image === 'string') return item.itunes.image;
    if (item.itunes.image.$ && item.itunes.image.$.href) return item.itunes.image.$.href;
  }
  
  // Priority 1: media:content with high resolution (usually best quality for news articles)
  if (item['media:content']) {
    if (Array.isArray(item['media:content'])) {
      // Sort by width to get highest resolution first
      const sortedMedia = item['media:content']
        .filter(m => m.$ && m.$.url && m.$.medium !== 'video')
        .sort((a, b) => {
          const widthA = parseInt(a.$.width) || 0;
          const widthB = parseInt(b.$.width) || 0;
          return widthB - widthA;
        });
      
      if (sortedMedia.length > 0) {
        const bestImage = sortedMedia[0];
        const width = parseInt(bestImage.$.width) || 0;
        // Only use if width is reasonable (avoid thumbnails < 300px)
        if (width >= 300 || width === 0) return bestImage.$.url;
      }
      
      // Fallback to first media:content
      if (item['media:content'][0] && item['media:content'][0].$.url) {
        return item['media:content'][0].$.url;
      }
    } else if (item['media:content'].$ && item['media:content'].$.url) {
      return item['media:content'].$.url;
    }
  }
  
  // Priority 2: enclosure (common for high quality images)
  if (item.enclosure) {
    if (item.enclosure.url) return item.enclosure.url;
    if (Array.isArray(item.enclosure)) {
      const imageEnclosure = item.enclosure.find(e => e.type && e.type.startsWith('image/'));
      if (imageEnclosure && imageEnclosure.url) return imageEnclosure.url;
      // If no image type, use first enclosure
      if (item.enclosure[0] && item.enclosure[0].url) return item.enclosure[0].url;
    }
  }
  
  // Priority 3: media:thumbnail (check dimensions to avoid small thumbnails)
  if (item['media:thumbnail']) {
    if (Array.isArray(item['media:thumbnail'])) {
      // Find largest thumbnail
      const sortedThumbs = item['media:thumbnail']
        .filter(t => t.$ && t.$.url)
        .sort((a, b) => {
          const widthA = parseInt(a.$.width) || 0;
          const widthB = parseInt(b.$.width) || 0;
          return widthB - widthA;
        });
      
      if (sortedThumbs.length > 0) {
        const bestThumb = sortedThumbs[0];
        const width = parseInt(bestThumb.$.width) || 0;
        // Prefer thumbnails >= 400px wide
        if (width >= 400 || width === 0) return bestThumb.$.url;
      }
    } else if (item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
      return item['media:thumbnail'].$.url;
    }
  }
  
  // Check media:group (nested media fields)
  if (item['media:group']) {
    if (item['media:group']['media:content']) {
      const content = item['media:group']['media:content'];
      if (content.$ && content.$.url) return content.$.url;
      if (Array.isArray(content) && content[0] && content[0].$.url) return content[0].$.url;
    }
    if (item['media:group']['media:thumbnail']) {
      const thumbnail = item['media:group']['media:thumbnail'];
      if (thumbnail.$ && thumbnail.$.url) return thumbnail.$.url;
      if (Array.isArray(thumbnail) && thumbnail[0] && thumbnail[0].$.url) return thumbnail[0].$.url;
    }
  }
  
  // Legacy fields
  if (item.media && item.media.$) return item.media.$.url;
  if (item.thumbnail && item.thumbnail.$) return item.thumbnail.$.url;
  
  // Try to extract from content/description HTML
  const content = item.contentEncoded || item.content || item.description || '';
  if (content) {
    // Look for img tags
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      // Filter out tracking pixels and small images
      const imgUrl = imgMatch[1];
      if (!imgUrl.includes('1x1') && !imgUrl.includes('pixel') && !imgUrl.includes('tracker')) {
        return imgMatch[1];
      }
    }
  }
  
  // Try og:image from link metadata (if link has queryable metadata)
  // This is a future enhancement - would require fetching the link
  
  // Category-specific fallback images for better UX
  const title = (item.title || '').toLowerCase();
  const description = (item.description || '').toLowerCase();
  
  if (title.includes('podcast') || description.includes('podcast')) {
    return 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80'; // Podcast microphone
  }
  
  if (title.includes('opinion') || title.includes('editorial')) {
    return 'https://images.unsplash.com/photo-1586339949216-35c2747e98f8?w=800&q=80'; // Opinion/writing
  }
  
  // Default fallback image
  return 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80';
}

// Helper to extract the actual source from RSS item (for bundled feeds)
function extractSource(item, defaultSource) {
  // Try to get source from various RSS fields
  if (item.creator) return item.creator; // dc:creator
  if (item.author) return item.author; // author field
  
  // Check for source in custom fields
  if (item.source && item.source.title) return item.source.title;
  if (item.source && typeof item.source === 'string') return item.source;
  
  // Try to extract from link domain
  if (item.link) {
    try {
      const url = new URL(item.link);
      const domain = url.hostname.replace('www.', '');
      
      // Map common domains to readable names
      const domainMap = {
        'nytimes.com': 'New York Times',
        'theguardian.com': 'The Guardian',
        'bbc.com': 'BBC News',
        'bbc.co.uk': 'BBC News',
        'cnn.com': 'CNN',
        'reuters.com': 'Reuters',
        'apnews.com': 'Associated Press',
        'washingtonpost.com': 'Washington Post',
        'wsj.com': 'Wall Street Journal',
        'foxnews.com': 'Fox News',
        'nbcnews.com': 'NBC News',
        'abcnews.go.com': 'ABC News',
        'cbsnews.com': 'CBS News',
        'npr.org': 'NPR',
        'politico.com': 'Politico',
        'bloomberg.com': 'Bloomberg',
        'cnbc.com': 'CNBC',
        'techcrunch.com': 'TechCrunch',
        'theverge.com': 'The Verge',
        'wired.com': 'Wired',
        'arstechnica.com': 'Ars Technica',
        'engadget.com': 'Engadget',
        'variety.com': 'Variety',
        'hollywoodreporter.com': 'Hollywood Reporter',
        'deadline.com': 'Deadline',
        'espn.com': 'ESPN',
        'si.com': 'Sports Illustrated',
        'cbssports.com': 'CBS Sports',
        'nypost.com': 'New York Post',
        'aljazeera.com': 'Al Jazeera',
        'dw.com': 'Deutsche Welle',
        'france24.com': 'France 24',
        'channelnewsasia.com': 'Channel NewsAsia',
        'scmp.com': 'South China Morning Post',
        'timesofindia.indiatimes.com': 'Times of India',
        'thestar.com.my': 'The Star Malaysia',
        'abc.net.au': 'ABC News Australia',
        'cbc.ca': 'CBC News',
        'usatoday.com': 'USA Today'
      };
      
      // Return mapped name or capitalize domain
      if (domainMap[domain]) return domainMap[domain];
      
      // Capitalize first letter of domain name
      const baseDomain = domain.split('.')[0];
      return baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1);
    } catch (e) {
      // If URL parsing fails, use default
    }
  }
  
  // Fall back to provided source
  return defaultSource;
}

// Parse a single RSS feed
async function parseFeed(feedConfig) {
  try {
    const feed = await parser.parseURL(feedConfig.url);
    const filteredItems = feed.items
      .filter(item => !shouldFilterOut(item)) // Apply filtering
      .map(item => ({
        title: stripHtml(item.title || 'Untitled'), // Strip HTML from title
        description: stripHtml(item.contentSnippet || item.description || ''), // Strip HTML from description
        content: stripHtml(item.content || item.contentEncoded || item.description || ''), // Strip HTML from content
        url: item.link || '', // Use 'url' instead of 'link' for consistency with components
        link: item.link || '', // Keep 'link' for backward compatibility
        image: extractImage(item),
        source: extractSource(item, feedConfig.source), // Dynamic source extraction
        publishedAt: item.pubDate ? new Date(item.pubDate).toLocaleString() : 'Recently',
        category: item.categories ? item.categories[0] : 'News'
      }));
    
    console.log(`${feedConfig.source}: ${feed.items.length} total, ${filteredItems.length} after filtering`);
    return filteredItems;
  } catch (error) {
    console.error(`Error parsing feed ${feedConfig.source}:`, error.message);
    return [];
  }
}

// Fetch multiple feeds in parallel (with batching for performance)
async function fetchFeeds(feedList) {
  console.log(`Starting to fetch ${feedList.length} RSS feeds...`);
  const feedPromises = feedList.map(feed => parseFeed(feed));
  const results = await Promise.allSettled(feedPromises);
  
  // Count successes and failures
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.length > 0).length;
  const failed = results.filter(r => r.status === 'rejected' || r.value.length === 0).length;
  console.log(`RSS Fetch complete: ${successful} successful, ${failed} failed/empty`);
  
  // Flatten and filter out failed requests
  return results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

// Check if cache is valid
function isCacheValid(cacheKey) {
  const cached = cache[cacheKey];
  if (!cached) return false; // Cache key doesn't exist yet
  return cached.data && (Date.now() - cached.timestamp < CACHE_DURATION);
}

exports.handler = async (event, context) => {
  const { type = 'news', category, search } = event.queryStringParameters || {};
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let data;
    const cacheKey = category ? `${type}_${category}` : type;

    // SEARCH FUNCTIONALITY - Search across all cached content
    if (search && search.trim().length > 0) {
      const searchTerm = search.toLowerCase().trim();
      console.log(`[SEARCH] Searching for: "${searchTerm}"`);
      
      // Collect all cached data
      const allData = [];
      Object.keys(cache).forEach(key => {
        if (cache[key].data && Array.isArray(cache[key].data)) {
          allData.push(...cache[key].data);
        }
      });
      
      // If cache is empty, fetch fresh news data
      if (allData.length === 0) {
        console.log('[SEARCH] Cache empty, fetching fresh news...');
        const freshData = await fetchFeeds(RSS_FEEDS.news);
        allData.push(...freshData);
      }
      
      // Search across title, description, content, source
      const searchResults = allData.filter(item => {
        const searchableText = `${item.title} ${item.description} ${item.content} ${item.source}`.toLowerCase();
        return searchableText.includes(searchTerm);
      });
      
      // Sort by relevance (count keyword matches)
      const scoredResults = searchResults.map(item => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        const matches = (text.match(new RegExp(searchTerm, 'g')) || []).length;
        return { ...item, relevanceScore: matches };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      console.log(`[SEARCH] Found ${scoredResults.length} results for "${searchTerm}"`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: scoredResults,
          cached: false,
          timestamp: Date.now(),
          count: scoredResults.length,
          searchTerm
        })
      };
    }

    // Check cache first (non-search requests)
    if (isCacheValid(cacheKey)) {
      console.log(`Returning cached data for ${cacheKey}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: cache[cacheKey].data,
          cached: true,
          timestamp: cache[cacheKey].timestamp
        })
      };
    }

    // Determine which feeds to fetch
    let feedsToFetch = RSS_FEEDS[type] || RSS_FEEDS.news;
    
    // If category specified, fetch relevant feeds for ANY type (news, opinions, videos, podcasts)
    if (category) {
      const cat = category.toLowerCase();
      
      if (cat === 'sports') {
        feedsToFetch = RSS_FEEDS.sports;
        console.log(`Fetching SPORTS ${type}:`, RSS_FEEDS.sports.length, 'sources');
      } else if (cat === 'tech' || cat === 'technology' || cat === 'business-tech') {
        feedsToFetch = RSS_FEEDS.tech;
        console.log(`Fetching TECH ${type}:`, RSS_FEEDS.tech.length, 'sources');
      } else if (cat === 'business' || cat === 'finance') {
        feedsToFetch = RSS_FEEDS.business;
        console.log(`Fetching BUSINESS ${type}:`, RSS_FEEDS.business.length, 'sources');
      } else if (cat === 'entertainment') {
        feedsToFetch = RSS_FEEDS.entertainment;
        console.log(`Fetching ENTERTAINMENT ${type}:`, RSS_FEEDS.entertainment.length, 'sources');
      } else if (cat === 'lifestyle') {
        feedsToFetch = RSS_FEEDS.lifestyle;
        console.log(`Fetching LIFESTYLE ${type}:`, RSS_FEEDS.lifestyle.length, 'sources');
      } else if (cat === 'culture') {
        feedsToFetch = RSS_FEEDS.culture;
        console.log(`Fetching CULTURE ${type}:`, RSS_FEEDS.culture.length, 'sources');
      } else {
        // For unknown categories, keep the default feeds for the type
        console.log(`Fetching ${type.toUpperCase()} feeds (default):`, feedsToFetch.length, 'sources');
      }
    }

    // Fetch fresh data
    console.log(`Fetching fresh data for ${cacheKey}`);    // Fetch fresh data
    console.log(`Fetching fresh data for ${cacheKey}`);
    data = await fetchFeeds(feedsToFetch);

    // Update cache
    cache[cacheKey] = {
      data,
      timestamp: Date.now()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data,
        cached: false,
        timestamp: Date.now(),
        count: data.length
      })
    };

  } catch (error) {
    console.error('RSS Aggregator Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch RSS feeds',
        message: error.message
      })
    };
  }
};
