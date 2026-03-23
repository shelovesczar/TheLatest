const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 30000, // Increased to 30 seconds
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'thumbnail'],
      ['media:group', 'mediaGroup'],
      ['itunes:image', 'itunesImage'],
      ['image', 'imageField'],
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

let articleImageCache = new Map();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_ITEMS_PER_FEED = 80;
const ARTICLE_IMAGE_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const MAX_IMAGE_ENRICH_ITEMS = 60;
const IMAGE_ENRICH_CONCURRENCY = 6;

const FALLBACK_IMAGE_URLS = new Set([
  'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80',
  'https://images.unsplash.com/photo-1586339949216-35c2747e98f8?w=800&q=80',
  'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&q=80',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80'
]);

function toPlainText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return value.map(toPlainText).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    const preferredKeys = ['_', 'name', 'term', 'label', 'title', 'text', 'value'];
    for (const key of preferredKeys) {
      if (key in value) {
        const textValue = toPlainText(value[key]);
        if (textValue) return textValue;
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  return '';
}

function toLowerSearchText(value) {
  return toPlainText(value).toLowerCase();
}

function normalizeTitle(value) {
  return toLowerSearchText(value)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(value) {
  const raw = toPlainText(value).trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    parsed.hash = '';

    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'guccounter', 'cmpid', 'ocid',
      'ref', 'ref_src', 'ref_url', 'source', 'spm', 'igshid'
    ];

    trackingParams.forEach((param) => parsed.searchParams.delete(param));

    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    const normalizedSearch = parsed.searchParams.toString();
    const searchSuffix = normalizedSearch ? `?${normalizedSearch}` : '';

    return `${parsed.origin}${normalizedPath}${searchSuffix}`;
  } catch {
    return raw.split('#')[0];
  }
}

function isFallbackImage(imageUrl) {
  return FALLBACK_IMAGE_URLS.has(toPlainText(imageUrl));
}

function getArticlePreviewImage(articleUrl) {
  const normalizedUrl = normalizeUrl(articleUrl);
  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) return null;
  return `https://image.thum.io/get/width/1200/noanimate/${encodeURIComponent(normalizedUrl)}`;
}

function getDedupKey(item = {}) {
  const normalizedUrl = normalizeUrl(item.url || item.link);
  if (normalizedUrl) return `url:${normalizedUrl}`;

  const normalizedHeadline = normalizeTitle(item.title);
  const normalizedSource = normalizeTitle(item.source);
  return `title:${normalizedSource}|${normalizedHeadline}`;
}

function scoreItemQuality(item = {}) {
  let score = 0;

  if (normalizeUrl(item.url || item.link)) score += 6;
  if (toPlainText(item.description).length >= 80) score += 4;
  if (toPlainText(item.content).length >= 150) score += 4;

  const image = toPlainText(item.image);
  if (image) {
    score += isFallbackImage(image) ? 1 : 8;
  }

  const publishedAt = Date.parse(toPlainText(item.publishedAt));
  if (!Number.isNaN(publishedAt)) {
    score += 2;
  }

  return score;
}

function mergeItems(primary = {}, secondary = {}) {
  const primaryScore = scoreItemQuality(primary);
  const secondaryScore = scoreItemQuality(secondary);
  const best = primaryScore >= secondaryScore ? primary : secondary;
  const other = best === primary ? secondary : primary;

  return {
    ...other,
    ...best,
    url: normalizeUrl(best.url || best.link || other.url || other.link),
    link: normalizeUrl(best.link || best.url || other.link || other.url),
    title: toPlainText(best.title || other.title),
    description: toPlainText(best.description || other.description),
    content: toPlainText(best.content || other.content),
    source: toPlainText(best.source || other.source),
    category: toPlainText(best.category || other.category) || 'News',
    image: toPlainText(best.image || other.image),
    publishedAt: toPlainText(best.publishedAt || other.publishedAt) || 'Recently'
  };
}

function dedupeItems(items = []) {
  const dedupeMap = new Map();

  items.forEach((item) => {
    if (!item) return;

    const normalizedItem = {
      ...item,
      url: normalizeUrl(item.url || item.link),
      link: normalizeUrl(item.link || item.url),
      title: toPlainText(item.title),
      description: toPlainText(item.description),
      content: toPlainText(item.content),
      source: toPlainText(item.source),
      category: toPlainText(item.category) || 'News',
      image: toPlainText(item.image),
      publishedAt: toPlainText(item.publishedAt) || 'Recently'
    };

    const dedupeKey = getDedupKey(normalizedItem);
    if (!dedupeMap.has(dedupeKey)) {
      dedupeMap.set(dedupeKey, normalizedItem);
      return;
    }

    const merged = mergeItems(dedupeMap.get(dedupeKey), normalizedItem);
    dedupeMap.set(dedupeKey, merged);
  });

  return Array.from(dedupeMap.values());
}

function pruneArticleImageCache() {
  const now = Date.now();
  for (const [key, value] of articleImageCache.entries()) {
    if (!value || now - value.timestamp > ARTICLE_IMAGE_CACHE_DURATION) {
      articleImageCache.delete(key);
    }
  }
}

function readCachedArticleImage(url) {
  const cached = articleImageCache.get(url);
  if (!cached) return undefined;

  if (Date.now() - cached.timestamp > ARTICLE_IMAGE_CACHE_DURATION) {
    articleImageCache.delete(url);
    return undefined;
  }

  return cached.image;
}

function cacheArticleImage(url, image) {
  articleImageCache.set(url, { image: image || '', timestamp: Date.now() });
}

function extractMetaImageCandidates(html = '') {
  const candidates = [];
  const add = (value) => {
    const normalized = toPlainText(value).trim();
    if (!normalized) return;
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/gi,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["'][^>]*>/gi
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      add(match[1]);
    }
  });

  return candidates;
}

async function fetchArticleImage(articleUrl) {
  const normalizedUrl = normalizeUrl(articleUrl);
  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) return null;

  const cachedImage = readCachedArticleImage(normalizedUrl);
  if (cachedImage !== undefined) return cachedImage || null;

  try {
    const response = await axios.get(normalizedUrl, {
      timeout: 3500,
      maxRedirects: 5,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const html = toPlainText(response.data);
    const metaCandidates = extractMetaImageCandidates(html)
      .map((candidate) => {
        try {
          return new URL(candidate, normalizedUrl).toString();
        } catch {
          return candidate;
        }
      });

    const bestImage = metaCandidates.find((candidate) => isValidImageUrl(candidate));
    const resolvedImage = bestImage || getArticlePreviewImage(normalizedUrl);
    cacheArticleImage(normalizedUrl, resolvedImage || null);
    return resolvedImage || null;
  } catch {
    const previewImage = getArticlePreviewImage(normalizedUrl);
    cacheArticleImage(normalizedUrl, previewImage || null);
    return previewImage || null;
  }
}

function shouldEnrichImage(item = {}) {
  const image = toPlainText(item.image);
  if (!image) return true;
  if (!isValidImageUrl(image)) return true;
  if (isFallbackImage(image)) return true;
  return false;
}

async function enrichItemsWithArticleImages(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  pruneArticleImageCache();

  const enriched = [...items];
  const indicesToEnrich = [];

  for (let index = 0; index < enriched.length; index += 1) {
    if (indicesToEnrich.length >= MAX_IMAGE_ENRICH_ITEMS) break;

    const item = enriched[index];
    if (!item || !shouldEnrichImage(item)) continue;

    const articleUrl = normalizeUrl(item.url || item.link);
    if (!articleUrl) continue;

    indicesToEnrich.push(index);
  }

  if (indicesToEnrich.length === 0) {
    return enriched;
  }

  for (let start = 0; start < indicesToEnrich.length; start += IMAGE_ENRICH_CONCURRENCY) {
    const chunk = indicesToEnrich.slice(start, start + IMAGE_ENRICH_CONCURRENCY);
    await Promise.all(chunk.map(async (index) => {
      const item = enriched[index];
      const articleUrl = normalizeUrl(item.url || item.link);
      if (!articleUrl) return;

      const articleImage = await fetchArticleImage(articleUrl);
      if (articleImage && isValidImageUrl(articleImage)) {
        enriched[index] = {
          ...item,
          image: articleImage
        };
      }
    }));
  }

  return enriched;
}

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
  const normalizedHtml = toPlainText(html);
  if (!normalizedHtml) return '';
  
  // Remove HTML tags
  let text = normalizedHtml.replace(/<[^>]*>/g, ' ');
  
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
  const title = toLowerSearchText(item.title);
  const description = toLowerSearchText(item.description);
  const link = toLowerSearchText(item.link);
  
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
    { url: 'https://feeds.washingtonpost.com/rss/opinions', source: 'Washington Post Opinion' },
    { url: 'https://thehill.com/opinion/feed/', source: 'The Hill Opinion' },
    { url: 'https://www.nationalreview.com/feed/', source: 'National Review' },
    { url: 'https://www.wsj.com/xml/rss/3_7041.xml', source: 'WSJ Opinion' },
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
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC52X5wxOL_s5yw0dQk7NtgA', source: 'Associated Press Video' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UChqUTb7kYRX8-EiaN3XFrSQ', source: 'Reuters Video' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCIRYBXDze5krPDzAEOxFGVA', source: 'The Guardian Video' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCrp_UI8XtuYfpiqluWLD7Lw', source: 'CNBC Television' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCIALMKvObZNtJ6AmdCLP7Lg', source: 'Bloomberg Television' },
    // RSS APP feeds
    { url: 'https://rss.app/feeds/wGtHhwQaOwup8JQs.xml', source: 'New York Post' },
    { url: 'https://rss.app/feeds/_iIjbt3XTnFFpU0Cv.xml', source: 'The Latest' }
  ],
  podcasts: [
    // News & Politics Podcasts
    { url: 'https://feeds.npr.org/500005/podcast.xml', source: 'NPR Politics' },
    { url: 'https://feeds.megaphone.fm/NYT8938532588', source: 'The Daily (NYT)' },
    { url: 'https://feeds.megaphone.fm/WWO3519750118', source: 'Pod Save America' },
    { url: 'https://feeds.simplecast.com/54nAGcIl', source: 'The Ezra Klein Show' },
    { url: 'https://feeds.npr.org/510318/podcast.xml', source: 'NPR Up First' },
    { url: 'https://feeds.megaphone.fm/WAPO5439518155', source: 'Washington Post' },
    { url: 'https://feeds.megaphone.fm/WSJ9463786025', source: 'WSJ What\'s News' },
    { url: 'https://feeds.megaphone.fm/ADL9452555852', source: 'The Ben Shapiro Show' },
    { url: 'https://feeds.megaphone.fm/newshour', source: 'PBS NewsHour' },
    { url: 'https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/a91018a4-ea4f-4130-bf55-ae270180c327/44710ecc-10bb-48d1-93c7-ae270180c33e/podcast.rss', source: 'Morning Joe' },
    { url: 'https://feeds.megaphone.fm/VMP7924054000', source: 'Pod Save the World' },
    { url: 'https://feeds.megaphone.fm/FOXN2895050347', source: 'Fox News' },
    { url: 'https://podcasts.files.bbci.co.uk/p02nq0gn.rss', source: 'BBC Global News Podcast' },
    { url: 'https://feeds.npr.org/510355/podcast.xml', source: 'NPR Consider This' },
    { url: 'https://feeds.npr.org/510289/podcast.xml', source: 'NPR Planet Money' },
    { url: 'https://feeds.megaphone.fm/VMP5705694065', source: 'Today, Explained' },
    
    // Technology & Business Podcasts
    { url: 'https://feeds.megaphone.fm/HSW8935723597', source: 'TED Tech' },
    { url: 'https://feeds.simplecast.com/XA_851k3', source: 'Reply All' },
    { url: 'https://lexfridman.com/feed/podcast/', source: 'Lex Fridman' },
    { url: 'https://feeds.megaphone.fm/recodedecode', source: 'Recode Decode' },
    { url: 'https://feeds.simplecast.com/qm_9xx0g', source: 'Acquired' },
    { url: 'https://feeds.megaphone.fm/ROOSTER7199250968', source: 'a16z Podcast' },
    { url: 'https://feeds.simplecast.com/4T39_jAj', source: 'Invest Like the Best' },
    { url: 'https://feeds.simplecast.com/wgl4xEgL', source: 'Masters of Scale' },
    { url: 'https://rss.art19.com/freakonomics-radio', source: 'Freakonomics' },
    { url: 'https://feeds.megaphone.fm/marketsnacks-daily', source: 'The Best One Yet' },
    { url: 'https://feeds.megaphone.fm/BINGE9775291795', source: 'How I Built This' },
    { url: 'https://feeds.pacific-content.com/mogul', source: 'Business Wars' },
    
    // Culture & Entertainment Podcasts
    { url: 'https://feeds.simplecast.com/rpXNNhRZ', source: 'Fresh Air' },
    { url: 'https://feeds.npr.org/510298/podcast.xml', source: 'TED Radio Hour' },
    { url: 'https://feeds.megaphone.fm/ROOSTER2072428631', source: 'WTF Marc Maron' },
    { url: 'https://feeds.simplecast.com/l2i9YnTd', source: 'Conan O\'Brien' },
    { url: 'https://www.omnycontent.com/d/playlist/aaea4e69-af51-495e-afc9-a9760146922b/14a43378-edb2-49be-8511-ab0d000a7030/d1b9612f-bb1b-4b85-9c0e-ab0d000a7038/podcast.rss', source: 'Armchair Expert' },
    { url: 'https://feeds.simplecast.com/wjQvV1gf', source: 'Smartless' },
    { url: 'https://rss.art19.com/stuff-you-should-know', source: 'Stuff You Should Know' },
    { url: 'https://feeds.simplecast.com/Nn6fjnB0', source: 'Radiolab' },
    { url: 'https://www.omnycontent.com/d/playlist/aaea4e69-af51-495e-afc9-a9760146922b/edc76a46-3151-4d67-b489-ab0500afc990/f51f3e9b-9488-4b6e-8f2b-ab0500afcb98/podcast.rss', source: 'The Bill Simmons' },
    { url: 'https://feeds.acast.com/public/shows/the-joe-rogan-experience', source: 'Joe Rogan Experience' },
    
    // Science & Education Podcasts
    { url: 'https://feeds.megaphone.fm/sciencevs', source: 'Science Vs' },
    { url: 'https://www.omnycontent.com/d/playlist/6c78df20-eafc-40a8-beeb-a82f00f2f97f/abac18c5-df1a-4e2e-9980-aead01005895/1aee9784-87c3-4a18-88bd-aead0100589e/podcast.rss', source: 'Hidden Brain' },
    { url: 'https://feeds.megaphone.fm/INFOROCKET4046796097', source: 'Stuff To Blow Your Mind' },
    { url: 'https://feeds.simplecast.com/Y2Y_sofX', source: 'Short Wave' },
    { url: 'https://feeds.megaphone.fm/sciencefriday', source: 'Science Friday' },
    { url: 'https://www.omnycontent.com/d/playlist/aaea4e69-af51-495e-afc9-a9760146922b/0dc6ed37-fbc7-4b36-9d7f-ab810177c2bb/dbcf2494-9783-4a10-850a-ab810177c2c6/podcast.rss', source: 'Ologies' },
    
    // True Crime & History Podcasts
    { url: 'https://feeds.simplecast.com/tOjJ6yCZ', source: 'Criminal' },
    { url: 'https://feeds.megaphone.fm/EMPN6330802945', source: 'My Favorite Murder' },
    { url: 'https://feeds.megaphone.fm/SU6174937661', source: 'Serial' },
    { url: 'https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/a91018a4-ea4f-4130-bf55-ae270180c327/44710ecc-10bb-48d1-93c7-ae270180c33e/podcast.rss', source: 'Hardcore History' },
    { url: 'https://rss.art19.com/revisionist-history', source: 'Revisionist History' },
    
    // Sports Podcasts
    { url: 'https://feeds.megaphone.fm/ESP5765452710', source: 'ESPN Daily' },
    { url: 'https://feeds.megaphone.fm/ESP4816647903', source: 'Pardon My Take' },
    { url: 'https://omnycontent.com/d/playlist/885bb800-15a4-4e4c-9cf6-a73c00f01729/3c127de2-bb99-43d8-9e14-aa3f0031bb0c/2edb23a4-67e9-4838-9aaa-aa3f0031bb0f/podcast.rss', source: 'The Ringer NBA' },
    { url: 'https://feeds.megaphone.fm/ESP6891740883', source: 'Fantasy Football' },
    
    // Health & Wellness Podcasts
    { url: 'https://feeds.megaphone.fm/HSW5985171007', source: 'The doctor\'s Farmacy' },
    { url: 'https://feeds.simplecast.com/_AqM7d43', source: 'Feel Better, Live More' },
    { url: 'https://rss.art19.com/huberman-lab', source: 'Huberman Lab' },
    { url: 'https://www.omnycontent.com/d/playlist/ccfe4372-0257-426c-8c45-aa8e01826bb2/a40daac5-7c4d-4fa1-96f2-aae900f4ad5d/17a5ba5b-46e0-40c8-a7e8-aae900f5126c/podcast.rss', source: 'On Purpose' },
    
    // Comedy Podcasts
    { url: 'https://feeds.simplecast.com/XOlG2ZQl', source: 'Smartless' },
    { url: 'https://rss.art19.com/my-dad-wrote-a-porno', source: 'My Dad Wrote A Porno' },
    { url: 'https://feeds.megaphone.fm/comedybangbang', source: 'Comedy Bang Bang' },
    
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
  let imageUrl = null;

  const candidateUrls = [];
  const addCandidate = (value) => {
    const normalized = toPlainText(value).trim();
    if (!normalized) return;
    if (!candidateUrls.includes(normalized)) {
      candidateUrls.push(normalized);
    }
  };

  const addFromObject = (obj) => {
    if (!obj) return;
    if (Array.isArray(obj)) {
      obj.forEach(addFromObject);
      return;
    }
    if (typeof obj === 'string') {
      addCandidate(obj);
      return;
    }
    if (typeof obj !== 'object') return;

    addCandidate(obj.url);
    addCandidate(obj.href);
    addCandidate(obj.src);
    if (obj.$ && typeof obj.$ === 'object') {
      addCandidate(obj.$.url);
      addCandidate(obj.$.href);
      addCandidate(obj.$.src);
    }
  };
  
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

  if (item.itunesImage) {
    addFromObject(item.itunesImage);
  }

  if (item.imageField) {
    addFromObject(item.imageField);
  }

  if (item.image) {
    addFromObject(item.image);
  }

  if (item.media) {
    addFromObject(item.media);
  }

  if (item.thumbnail) {
    addFromObject(item.thumbnail);
  }

  if (item.enclosures) {
    addFromObject(item.enclosures);
  }

  if (item['im:image']) {
    addFromObject(item['im:image']);
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
        // Only use if width is reasonable (prefer images >= 400px, but accept unknowns)
        if (width >= 400 || width === 0) {
          imageUrl = bestImage.$.url;
          if (isValidImageUrl(imageUrl)) return imageUrl;
        }
      }
      
      // Fallback to first media:content
      if (item['media:content'][0] && item['media:content'][0].$.url) {
        imageUrl = item['media:content'][0].$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
    } else if (item['media:content'].$ && item['media:content'].$.url) {
      imageUrl = item['media:content'].$.url;
      if (isValidImageUrl(imageUrl)) return imageUrl;
    }
  }
  
  // Priority 2: enclosure (common for high quality images)
  if (item.enclosure) {
    if (item.enclosure.url) {
      imageUrl = item.enclosure.url;
      if (isValidImageUrl(imageUrl)) return imageUrl;
    }
    if (Array.isArray(item.enclosure)) {
      const imageEnclosure = item.enclosure.find(e => e.type && e.type.startsWith('image/'));
      if (imageEnclosure && imageEnclosure.url) {
        imageUrl = imageEnclosure.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
      // If no image type, use first enclosure
      if (item.enclosure[0] && item.enclosure[0].url) {
        imageUrl = item.enclosure[0].url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
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
        if (width >= 400 || width === 0) {
          imageUrl = bestThumb.$.url;
          if (isValidImageUrl(imageUrl)) return imageUrl;
        }
      }
    } else if (item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
      imageUrl = item['media:thumbnail'].$.url;
      if (isValidImageUrl(imageUrl)) return imageUrl;
    }
  }
  
  // Check media:group (nested media fields)
  if (item['media:group']) {
    if (item['media:group']['media:content']) {
      const content = item['media:group']['media:content'];
      if (content.$ && content.$.url) {
        imageUrl = content.$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
      if (Array.isArray(content) && content[0] && content[0].$.url) {
        imageUrl = content[0].$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
    }
    if (item['media:group']['media:thumbnail']) {
      const thumbnail = item['media:group']['media:thumbnail'];
      if (thumbnail.$ && thumbnail.$.url) {
        imageUrl = thumbnail.$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
      if (Array.isArray(thumbnail) && thumbnail[0] && thumbnail[0].$.url) {
        imageUrl = thumbnail[0].$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
    }
  }

  if (item.mediaGroup) {
    addFromObject(item.mediaGroup);
  }
  
  // Legacy fields
  if (item.media && item.media.$) {
    imageUrl = item.media.$.url;
    if (isValidImageUrl(imageUrl)) return imageUrl;
  }
  if (item.thumbnail && item.thumbnail.$) {
    imageUrl = item.thumbnail.$.url;
    if (isValidImageUrl(imageUrl)) return imageUrl;
  }

  for (const candidateUrl of candidateUrls) {
    if (isValidImageUrl(candidateUrl)) return candidateUrl;
  }
  
  // Try to extract from content/description HTML
  const content = item.contentEncoded || item.content || item.description || '';
  if (content) {
    // Look for img tags - prefer larger images
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    const imgUrls = [];
    
    while ((match = imgRegex.exec(content)) !== null) {
      const url = match[1];
      // Filter out tracking pixels and small images
      if (!url.includes('1x1') && !url.includes('pixel') && !url.includes('tracker') && 
          !url.includes('tracking') && !url.includes('icon') && !url.includes('logo')) {
        // Check for size hints in URL or attributes
        const imgTag = match[0];
        const widthMatch = imgTag.match(/width=["']?(\d+)/i);
        const width = widthMatch ? parseInt(widthMatch[1]) : 0;
        
        if (width >= 300 || width === 0) {
          imgUrls.push({ url, width });
        }
      }
    }

    const srcsetRegex = /srcset=["']([^"']+)["']/gi;
    while ((match = srcsetRegex.exec(content)) !== null) {
      const srcset = match[1];
      srcset
        .split(',')
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean)
        .forEach((url) => imgUrls.push({ url, width: 0 }));
    }
    
    // Sort by width and return largest
    if (imgUrls.length > 0) {
      imgUrls.sort((a, b) => b.width - a.width);
      imageUrl = imgUrls[0].url;
      if (isValidImageUrl(imageUrl)) return imageUrl;
    }
  }
  
  // Category-specific fallback images for better UX
  const title = toLowerSearchText(item.title);
  const description = toLowerSearchText(item.description);

  const articlePreviewImage = getArticlePreviewImage(item.link || item.url);
  if (articlePreviewImage) {
    return articlePreviewImage;
  }
  
  if (title.includes('podcast') || description.includes('podcast')) {
    return 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80'; // Podcast microphone
  }
  
  if (title.includes('opinion') || title.includes('editorial')) {
    return 'https://images.unsplash.com/photo-1586339949216-35c2747e98f8?w=800&q=80'; // Opinion/writing
  }
  
  if (title.includes('video') || description.includes('video')) {
    return 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&q=80'; // Video
  }
  
  // Default fallback image
  return 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80';
}

// Helper function to validate image URLs
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Filter out obviously invalid URLs
  if (url.length < 10) return false;
  if (url.includes('1x1')) return false;
  if (url.includes('pixel') && !url.includes('pixels')) return false;
  if (url.includes('tracker')) return false;
  if (url.includes('tracking')) return false;
  
  // Check for valid protocols
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  
  return true;
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
    const rawItems = Array.isArray(feed.items) ? feed.items.slice(0, MAX_ITEMS_PER_FEED) : [];
    const filteredItems = rawItems
      .filter(item => !shouldFilterOut(item)) // Apply filtering
      .map(item => ({
        title: stripHtml(item.title || 'Untitled'), // Strip HTML from title
        description: stripHtml(item.contentSnippet || item.description || ''), // Strip HTML from description
        content: stripHtml(item.content || item.contentEncoded || item.description || ''), // Strip HTML from content
        url: toPlainText(item.link), // Use 'url' instead of 'link' for consistency with components
        link: toPlainText(item.link), // Keep 'link' for backward compatibility
        image: extractImage(item),
        source: extractSource(item, feedConfig.source), // Dynamic source extraction
        publishedAt: item.pubDate ? new Date(item.pubDate).toLocaleString() : 'Recently',
        category: toPlainText(item.categories ? item.categories[0] : 'News') || 'News'
      }));
    
    console.log(`${feedConfig.source}: ${rawItems.length} sampled, ${filteredItems.length} after filtering`);
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
  const allItems = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value)
  
  const deduped = dedupeItems(allItems)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const enriched = await enrichItemsWithArticleImages(deduped);

  console.log(`Deduped ${allItems.length} items down to ${deduped.length}; enriched images for ${Math.min(deduped.length, MAX_IMAGE_ENRICH_ITEMS)} candidates`);
  return enriched;
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

    // SEARCH FUNCTIONALITY - Cache-first, future-proof search across ALL RSS feeds
    // Automatically includes any new categories/feeds added to RSS_FEEDS
    if (search && search.trim().length > 0) {
      const searchTerm = toLowerSearchText(search).trim();
      console.log(`[SEARCH] Searching for: "${searchTerm}"`);

      // ── Step 1: Collect all cached data (instant, no network) ──────────────
      const allData = [];
      const staleCacheKeys = [];
      Object.keys(cache).forEach(key => {
        if (cache[key].data && Array.isArray(cache[key].data)) {
          allData.push(...cache[key].data);
          if (!isCacheValid(key)) staleCacheKeys.push(key);  // stale but still usable
        } else {
          staleCacheKeys.push(key); // empty
        }
      });
      console.log(`[SEARCH] ${allData.length} items in cache; ${staleCacheKeys.length} stale/empty buckets`);

      // ── Step 2: Only fetch categories that are NOT already cached ─────────
      // This prevents the timeout that caused 500 errors when all categories
      // had to be fetched fresh in parallel on every search request.
      // Future-proof: any new category added to RSS_FEEDS is automatically included.
      if (staleCacheKeys.length > 0) {
        // Tightly limited sources per category specifically for search-triggered fetches
        const SEARCH_SOURCES_LIMIT = 5; // keeps each category fetch under ~2s
        const GLOBAL_SEARCH_TIMEOUT = 7500; // 7.5s stays under the 10s Netlify limit

        const fetchCategoryWithTimeout = async (catKey) => {
          try {
            const feedList = RSS_FEEDS[catKey] || [];
            const sourcesToFetch = feedList.slice(0, SEARCH_SOURCES_LIMIT);
            if (sourcesToFetch.length === 0) return [];
            console.log(`[SEARCH] Fetching stale/empty category "${catKey}": ${sourcesToFetch.length} sources`);

            const perCategoryTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout: ${catKey}`)), 3000)
            );
            return await Promise.race([fetchFeeds(sourcesToFetch), perCategoryTimeout]);
          } catch (err) {
            console.warn(`[SEARCH] Skipped "${catKey}": ${err.message}`);
            return [];
          }
        };

        try {
          // Global race: either all stale categories finish or we cut off at 7.5s
          const globalTimeout = new Promise(resolve =>
            setTimeout(() => {
              console.warn('[SEARCH] Global timeout hit — using partial results');
              resolve([]);
            }, GLOBAL_SEARCH_TIMEOUT)
          );

          const fetchAll = Promise.all(staleCacheKeys.map(fetchCategoryWithTimeout))
            .then(results => results.flat());

          const freshData = await Promise.race([fetchAll, globalTimeout]);
          console.log(`[SEARCH] Fetched ${freshData.length} fresh articles from stale categories`);

          // Merge fresh + cached, dedup with URL/title heuristics
          const mergedItems = dedupeItems([...allData, ...freshData]);
          allData.length = 0;
          allData.push(...mergedItems);
        } catch (err) {
          console.error('[SEARCH] Unexpected error during stale-fetch:', err.message);
          // allData still has whatever was cached — safe to continue
        }
      }

      console.log(`[SEARCH] Total ${allData.length} unique items available for search`);
      
      // Enhanced search with fuzzy matching and variations
      const searchResults = allData.filter(item => {
        if (!item || !item.title) return false; // Skip invalid items
        
        const title = toLowerSearchText(item.title);
        const description = toLowerSearchText(item.description);
        const content = toLowerSearchText(item.content);
        const source = toLowerSearchText(item.source);
        const category = toLowerSearchText(item.category);
        const searchableText = `${title} ${description} ${content} ${source} ${category}`;
        
        // Exact phrase match (highest priority)
        if (searchableText.includes(searchTerm)) {
          return true;
        }
        
        // Word-based matching with variations (handles plural/singular)
        const searchWords = searchTerm.split(/\s+/);
        return searchWords.every(word => {
          if (word.length < 2) return true; // Skip single characters
          
          // Check multiple variations of the word
          const variations = [
            word,                                 // Original (e.g., "dodger")
            word + 's',                          // Plural (e.g., "dodgers")
            word + 'es',                         // Alt plural (e.g., "beaches")
            word.endsWith('s') ? word.slice(0, -1) : null,  // Singular from plural (e.g., "dodger" from "dodgers")
            word.endsWith('es') ? word.slice(0, -2) : null, // Singular from es plural
            word.endsWith('ies') ? word.slice(0, -3) + 'y' : null, // cities -> city
            word.endsWith('y') ? word.slice(0, -1) + 'ies' : null  // city -> cities
          ].filter(v => v !== null);
          
          // Check if any variation appears in the searchable text
          return variations.some(variant => searchableText.includes(variant));
        });
      });
      
      // Remove duplicates using URL/title/source heuristics
      const uniqueResults = dedupeItems(searchResults);
      
      // Sort by relevance (count keyword matches and title relevance)
      const scoredResults = uniqueResults.map(item => {
        const titleText = toLowerSearchText(item.title);
        const descText = toLowerSearchText(item.description);
        
        // Calculate relevance score
        let score = 0;
        
        // Escape special regex characters in search term
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        try {
          // Title matches are worth more
          const titleMatches = (titleText.match(new RegExp(escapedSearchTerm, 'g')) || []).length;
          score += titleMatches * 5;
          
          // Description matches
          const descMatches = (descText.match(new RegExp(escapedSearchTerm, 'g')) || []).length;
          score += descMatches * 2;
        } catch (regexError) {
          // Fallback to simple string counting if regex fails
          console.warn('[SEARCH] Regex error, using fallback counting:', regexError.message);
          const titleMatches = (titleText.split(searchTerm).length - 1);
          const descMatches = (descText.split(searchTerm).length - 1);
          score += titleMatches * 5 + descMatches * 2;
        }
        
        // Exact title match gets bonus
        if (titleText.includes(searchTerm)) {
          score += 10;
        }
        
        // Word matches for multi-word searches
        const searchWords = searchTerm.split(/\s+/);
        searchWords.forEach(word => {
          if (word.length >= 3) {
            if (titleText.includes(word)) score += 3;
            if (descText.includes(word)) score += 1;
          }
        });
        
        return { ...item, relevanceScore: score };
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
      const cat = toLowerSearchText(category);
      
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
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      type: event.queryStringParameters?.type,
      search: event.queryStringParameters?.search
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch RSS feeds',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
