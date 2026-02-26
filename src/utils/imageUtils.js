/**
 * Image Utilities - Robust image handling with fallbacks
 * Future-proofed to prevent missing/broken images across the site
 */

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
 * Handle image error with cascading fallbacks
 * @param {Event} event - The error event
 * @param {string} category - The content category
 */
export function handleImageError(event, category = 'general') {
  const img = event.target;
  
  // Prevent infinite loop if fallback also fails
  if (img.dataset.fallbackAttempted === 'true') {
    // Use local SVG fallback as last resort
    img.src = getLocalFallback(category);
    img.dataset.fallbackAttempted = 'final';
    return;
  }
  
  // First fallback: try category-specific image from Unsplash
  if (!img.dataset.fallbackAttempted) {
    img.src = getFallbackImage(category);
    img.dataset.fallbackAttempted = 'true';
    return;
  }
}

/**
 * Validate if a URL is likely to be a valid image
 * @param {string} url - The image URL to validate
 * @returns {boolean} True if URL seems valid
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Check for common issues
  if (url.includes('1x1') || url.includes('pixel') || url.includes('tracker')) return false;
  if (url.length < 10) return false;
  
  // Check for valid image extensions or common image hosts
  const validPatterns = [
    /\.(jpg|jpeg|png|gif|webp|svg)($|\?|#)/i,
    /unsplash\.com/i,
    /imgur\.com/i,
    /cloudinary\.com/i,
    /ytimg\.com/i,
    /googleusercontent\.com/i
  ];
  
  return validPatterns.some(pattern => pattern.test(url));
}

/**
 * Get a safe image source with fallback
 * @param {string} imageUrl - The primary image URL
 * @param {string} category - The content category for fallback
 * @returns {string} A valid image URL
 */
export function getSafeImageSrc(imageUrl, category = 'general') {
  if (isValidImageUrl(imageUrl)) {
    return imageUrl;
  }
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
 * Create image props with error handling
 * @param {string} src - Primary image source
 * @param {string} alt - Alt text
 * @param {string} category - Content category for fallbacks
 * @returns {object} Props object for img element
 */
export function getImageProps(src, alt = '', category = 'general') {
  return {
    src: getSafeImageSrc(src, category),
    alt: alt || 'Content image',
    onError: (e) => handleImageError(e, category),
    loading: 'lazy',
    decoding: 'async'
  };
}
