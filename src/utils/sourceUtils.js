const DOMAIN_MAP = {
  'nytimes.com': 'New York Times',
  'bbc.com': 'BBC News',
  'bbc.co.uk': 'BBC News',
  'cnn.com': 'CNN',
  'foxnews.com': 'Fox News',
  'reuters.com': 'Reuters',
  'theguardian.com': 'The Guardian',
  'washingtonpost.com': 'Washington Post',
  'wsj.com': 'Wall Street Journal',
  'apnews.com': 'Associated Press',
  'nbcnews.com': 'NBC News',
  'abcnews.go.com': 'ABC News',
  'abcnews.com': 'ABC News',
  'cbsnews.com': 'CBS News',
  'npr.org': 'NPR',
  'politico.com': 'Politico',
  'latimes.com': 'LA Times',
  'usatoday.com': 'USA Today',
  'nypost.com': 'New York Post',
  'bloomberg.com': 'Bloomberg',
  'cnbc.com': 'CNBC',
  'ft.com': 'Financial Times',
  'espn.com': 'ESPN',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'variety.com': 'Variety',
  'hollywoodreporter.com': 'The Hollywood Reporter',
  'rollingstone.com': 'Rolling Stone',
  'billboard.com': 'Billboard',
  'vox.com': 'Vox',
  'wired.com': 'Wired',
  'forbes.com': 'Forbes',
  'economist.com': 'The Economist',
  'lexfridman.com': 'Lex Fridman',
  'lawfaremedia.org': 'Lawfare',
  'ted.com': 'TED',
};

const cleanText = (value) => String(value || '').replace(/^by\s+/i, '').trim();

const titleCase = (value) => value
  .split(/[-\s]+/)
  .filter(Boolean)
  .map((word) => {
    if (word.length <= 3 && word === word.toUpperCase()) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  })
  .join(' ');

const formatHostnameOutlet = (hostname) => {
  const normalized = String(hostname || '').replace(/^www\./, '').toLowerCase();
  if (!normalized) return '';

  const directMatch = DOMAIN_MAP[normalized];
  if (directMatch) return directMatch;

  const suffixMatch = Object.keys(DOMAIN_MAP).find((domain) => normalized === domain || normalized.endsWith(`.${domain}`));
  if (suffixMatch) return DOMAIN_MAP[suffixMatch];

  const labels = normalized.split('.').filter(Boolean);
  const root = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
  return titleCase(root || '');
};

const looksLikeByline = (value) => {
  const source = cleanText(value);
  if (!source) return false;

  const lower = source.toLowerCase();
  if (lower.includes(' and ') || lower.includes('&') || /[,;|]/.test(source)) return true;

  const words = source.split(/\s+/).filter(Boolean);
  return words.length >= 4;
};

export const deriveMediaOutlet = (itemOrSource, maybeUrl) => {
  const source = typeof itemOrSource === 'object' && itemOrSource !== null ? itemOrSource.source : itemOrSource;
  const url = typeof itemOrSource === 'object' && itemOrSource !== null
    ? (itemOrSource.url || itemOrSource.link)
    : maybeUrl;

  try {
    const hostname = new URL(String(url || '')).hostname;
    const outletFromUrl = formatHostnameOutlet(hostname);
    if (outletFromUrl) return outletFromUrl;
  } catch {
    // Ignore invalid URLs and fall back to source text.
  }

  const cleanedSource = cleanText(source);
  if (!cleanedSource) return 'Unknown Source';
  if (looksLikeByline(cleanedSource)) return 'Unknown Source';
  return cleanedSource;
};
