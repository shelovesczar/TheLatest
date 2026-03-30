/**
 * Image Utilities - Robust image handling with fallbacks
 * Future-proofed to prevent missing/broken images across the site
 */

// Sources that already serve optimized images — skip the proxy for these
const SKIP_PROXY_HOSTS = [
  'images.weserv.nl',       // already proxied
  'picsum.photos',           // already high quality
  'unsplash.com',            // handles its own CDN params
  'thum.io',                 // screenshot service
  'cloudinary.com',          // self-optimizing CDN
  'imgix.net',               // self-optimizing CDN
];

/**
 * Route an image URL through images.weserv.nl for free WebP conversion,
 * sharpening, and upscaling to the requested width.
 *
 * @param {string}  url           Source image URL
 * @param {object}  opts
 * @param {number}  opts.width    Output width in px (default 1200)
 * @param {number}  opts.quality  Output quality 1-100 (default 88)
 * @param {boolean} opts.sharpen  Apply sharpening pass (default true)
 * @returns {string} Processed URL
 */
export function processImageUrl(url, opts = {}) {
  if (!url || typeof url !== 'string') return url;

  // Don't touch data URIs
  if (url.startsWith('data:')) return url;

  // Only proxy http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url;

  // Skip already-optimized sources
  if (SKIP_PROXY_HOSTS.some(host => url.includes(host))) return url;

  const { width = 1200, quality = 88, sharpen = true } = opts;

  const params = new URLSearchParams({
    url,
    w:      String(width),
    q:      String(quality),
    output: 'webp',        // WebP is ~30% smaller at equal quality
    fit:    'cover',
    ...(sharpen ? { sharp: '1' } : {}),
  });

  return `https://images.weserv.nl/?${params.toString()}`;
}

// Category-based fallback images (using high-quality placeholders)
export const FALLBACK_IMAGES = {
  news: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&q=80&fit=crop',
  opinions: 'https://images.unsplash.com/photo-1586339949216-35c2747e98f8?w=800&h=600&q=80&fit=crop',
  videos: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&h=600&q=80&fit=crop',
  podcasts: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&h=600&q=80&fit=crop',
  politics: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=600&q=80&fit=crop',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&q=80&fit=crop',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&q=80&fit=crop',
  business: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&q=80&fit=crop',
  entertainment: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=600&q=80&fit=crop',
  health: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&q=80&fit=crop',
  science: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&q=80&fit=crop',
  general: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&q=80&fit=crop'
};

// Local fallback images (SVG data URIs) - used when external images fail
export const LOCAL_FALLBACKS = {
  news: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Cdefs%3E%3ClinearGradient id="a" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%232563eb;stop-opacity:1"/%3E%3Cstop offset="100%25" style="stop-color:%231e40af;stop-opacity:1"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="800" height="600" fill="url(%23a)"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial,sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3ENews%3C/text%3E%3C/svg%3E',
  opinions: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Cdefs%3E%3ClinearGradient id="a" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%239333ea;stop-opacity:1"/%3E%3Cstop offset="100%25" style="stop-color:%236b21a8;stop-opacity:1"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="800" height="600" fill="url(%23a)"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial,sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EOpinions%3C/text%3E%3C/svg%3E',
  videos: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Cdefs%3E%3ClinearGradient id="a" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23dc2626;stop-opacity:1"/%3E%3Cstop offset="100%25" style="stop-color:%239f1239;stop-opacity:1"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="800" height="600" fill="url(%23a)"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial,sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EVideo%3C/text%3E%3C/svg%3E',
  podcasts: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Cdefs%3E%3ClinearGradient id="a" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23059669;stop-opacity:1"/%3E%3Cstop offset="100%25" style="stop-color:%23047857;stop-opacity:1"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="800" height="600" fill="url(%23a)"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial,sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EPodcast%3C/text%3E%3C/svg%3E',
  general: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Cdefs%3E%3ClinearGradient id="a" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23475569;stop-opacity:1"/%3E%3Cstop offset="100%25" style="stop-color:%231e293b;stop-opacity:1"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="800" height="600" fill="url(%23a)"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial,sans-serif" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle"%3EThe Latest%3C/text%3E%3C/svg%3E'
};

/**
 * Deterministic photo fallback (always an actual image, never text SVG)
 * Uses a stable seed so the same content gets the same fallback image.
 * @param {string} category
 * @param {string} seedText
 * @returns {string}
 */
export function getPhotoFallback(category = 'general', seedText = '') {
  const normalizedCategory = category?.toLowerCase() || 'general';
  const normalizedSeed = String(seedText || '').trim().toLowerCase();
  const seed = encodeURIComponent(`${normalizedCategory}-${normalizedSeed || 'image'}`);
  return `https://picsum.photos/seed/${seed}/1200/800`;
}

/**
 * Get the appropriate fallback image for a category
 * @param {string} category - The content category (news, opinions, videos, podcasts, etc.)
 * @returns {string} Fallback image URL
 */
export function getFallbackImage(category = 'general') {
  const normalizedCategory = category?.toLowerCase() || 'general';
  return FALLBACK_IMAGES[normalizedCategory] || FALLBACK_IMAGES.general;
}

/**
 * Get local SVG fallback (guaranteed to work offline)
 * @param {string} category - The content category
 * @returns {string} Data URI for SVG fallback
 */
export function getLocalFallback(category = 'general') {
  const normalizedCategory = category?.toLowerCase() || 'general';
  return LOCAL_FALLBACKS[normalizedCategory] || LOCAL_FALLBACKS.general;
}

/**
 * Handle image error with cascading fallbacks.
 *
 * Chain: proxy URL → original source URL → Unsplash category → Picsum deterministic
 *
 * Many news CDNs block external proxy requests (weserv.nl, etc.), so the most
 * important step is falling back to the original unproxied URL before giving up
 * and showing a generic placeholder.
 *
 * @param {Event} event - The error event
 * @param {string} category - The content category
 */
export function handleImageError(event, category = 'general') {
  const img = event.target;
  const seedText = img?.dataset?.fallbackSeed || img?.alt || '';

  // Prevent infinite loop
  if (img.dataset.fallbackAttempted === 'final') return;

  // Step 1: proxy failed → try the original unproxied URL
  if (!img.dataset.fallbackAttempted) {
    const originalSrc = img.dataset.originalSrc;
    if (originalSrc && originalSrc !== img.src) {
      img.src = originalSrc;
      img.dataset.fallbackAttempted = 'original';
      return;
    }
    // No original stored — jump straight to category fallback
    img.src = getFallbackImage(category);
    img.dataset.fallbackAttempted = 'category';
    return;
  }

  // Step 2: original also failed → category-specific Unsplash image
  if (img.dataset.fallbackAttempted === 'original') {
    img.src = getFallbackImage(category);
    img.dataset.fallbackAttempted = 'category';
    return;
  }

  // Step 3: final deterministic photo (always a real image)
  if (img.dataset.fallbackAttempted === 'category') {
    img.src = getPhotoFallback(category, seedText);
    img.dataset.fallbackAttempted = 'final';
  }
}

/**
 * Validate if a URL is likely to be a valid image
 * @param {string} url - The image URL to validate
 * @returns {boolean} True if URL seems valid
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const normalized = url.trim();
  
  // Check for common issues
  if (normalized.includes('1x1') || normalized.includes('pixel') || normalized.includes('tracker')) return false;
  if (normalized.length < 10) return false;

  // Allow local SVG/data URI fallbacks
  if (normalized.startsWith('data:image/')) return true;

  // Must be a web URL
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) return false;

  // Block obvious non-image/asset endpoints
  const blockedPatterns = [
    /\/ads?(\/|$)/i,
    /\/tracking(\/|$)/i,
    /\/analytics(\/|$)/i,
    /\/pixel(\/|$)/i
  ];
  if (blockedPatterns.some((pattern) => pattern.test(normalized))) return false;
  
  // Prefer known image extensions/hosts, but allow generic CDN URLs
  const validPatterns = [
    /\.(jpg|jpeg|png|gif|webp|svg)($|\?|#)/i,
    /\.(avif|bmp|tiff?)($|\?|#)/i,
    /unsplash\.com/i,
    /imgur\.com/i,
    /cloudinary\.com/i,
    /ytimg\.com/i,
    /googleusercontent\.com/i,
    /cdn\./i,
    /images?\./i,
    /media\./i
  ];
  
  if (validPatterns.some(pattern => pattern.test(normalized))) return true;

  // Final fallback: accept http(s) URLs that don't look like HTML/doc endpoints
  const likelyNonImage = /\.(html?|php|asp|aspx|jsp)($|\?|#)/i;
  return !likelyNonImage.test(normalized);
}

/**
 * Get a safe image source with fallback, routed through the quality proxy.
 * @param {string} imageUrl - The primary image URL
 * @param {string} category - The content category for fallback
 * @param {object} opts     - Options forwarded to processImageUrl
 * @returns {string} A valid, optimised image URL
 */
export function getSafeImageSrc(imageUrl, category = 'general', opts = {}) {
  if (isValidImageUrl(imageUrl)) {
    return processImageUrl(imageUrl, opts);
  }
  // Don't proxy fallback images — they're already quality-controlled
  return getFallbackImage(category);
}

/**
 * Preload an image to check if it's valid
 * @param {string} url - The image URL
 * @returns {Promise<boolean>} True if image loads successfully
 */
export function preloadImage(url) {
  return new Promise((resolve) => {
    if (!isValidImageUrl(url)) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    const timeout = setTimeout(() => {
      resolve(false);
    }, 5000); // 5 second timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = url;
  });
}

/**
 * Create image props with error handling and quality processing.
 *
 * @param {string} src      - Primary image source
 * @param {string} alt      - Alt text
 * @param {string} category - Content category for fallbacks
 * @param {object} opts     - Optional hints: { width, quality, sharpen }
 *   width   — intended display width in px; drives proxy upscale (default 1200)
 *   quality — proxy quality 1-100 (default 88)
 *   sharpen — whether to apply proxy sharpening (default true)
 * @returns {object} Props object for img element
 */
export function getImageProps(src, alt = '', category = 'general', opts = {}) {
  const proxied = getSafeImageSrc(src, category, opts);
  // Store the raw original URL so handleImageError can fall back to it
  // if the proxy (weserv.nl) is blocked by the image's CDN.
  const original = (src && src !== proxied) ? src : undefined;
  return {
    src: proxied,
    alt: alt || 'Content image',
    'data-fallback-seed': alt || '',
    ...(original ? { 'data-original-src': original } : {}),
    onError: (e) => handleImageError(e, category),
    loading: 'lazy',
    decoding: 'async',
  };
}
