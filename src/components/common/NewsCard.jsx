import { memo } from 'react';
import LazyImage from '../common/LazyImage';
import './NewsCard.css';

/**
 * Safely coerce an RSS-parsed value to a plain string.
 * RSS parsers return XML nodes with attributes as { _: "text", $: { attr } }.
 * Any non-string / non-number value is converted or discarded.
 */
const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  // rss-parser XML object: { _: "text content", $: { ... } }
  if (typeof val === 'object' && typeof val._ === 'string') return val._;
  // Array — join first-level strings
  if (Array.isArray(val)) return val.map(safeStr).filter(Boolean).join(', ');
  return '';
};

/**
 * Format ISO timestamp to date-only format (MM-DD-YYYY)
 * If the string doesn't look like an ISO timestamp, return as-is
 */
const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return '';
  // Check if it looks like an ISO timestamp (contains 'T' and looks like YYYY-MM-DDTHH:...)
  const isoMatch = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    // Convert from YYYY-MM-DD to MM-DD-YYYY
    const [, year, month, day] = isoMatch;
    return `${month}-${day}-${year}`;
  }
  // Otherwise return as-is (e.g., "2h ago", "1d ago", etc.)
  return timeStr;
};

const getSourceIconUrl = (url) => {
  if (!url) return '';
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
};

/**
 * Apple News-style News Card Component
 * Large image with text overlay
 */
const NewsCard = ({ 
  title, 
  image, 
  source, 
  timeAgo, 
  url,
  category,
  featured = false 
}) => {
  const safeTitle    = safeStr(title);
  const safeSource   = safeStr(source);
  const rawTimeAgo   = safeStr(timeAgo);
  const safeTimeAgo  = formatTimeDisplay(rawTimeAgo);
  const safeCategory = safeStr(category);
  const safeImage    = safeStr(image);
  const safeUrl      = safeStr(url);
  const sourceIconUrl = getSourceIconUrl(safeUrl);

  // Guard: don't render broken cards — prevents crashes from malformed API data
  if (!safeTitle) return null;

  return (
    <a 
      href={safeUrl || '#'} 
      className={`news-card ${featured ? 'featured' : 'compact'}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="news-card-image-container">
        <LazyImage
          src={safeImage || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80'}
          alt={safeTitle}
          className="news-card-image"
        />

        {safeCategory && (
          <div className="news-card-badge">{safeCategory}</div>
        )}
      </div>

      <div className="news-card-content">
        <div className="news-card-meta">
          <span className="news-card-source-wrap">
            {sourceIconUrl ? <img className="news-card-source-icon" src={sourceIconUrl} alt="" aria-hidden="true" loading="lazy" /> : null}
            <span className="news-card-source">{safeSource}</span>
          </span>
          {safeTimeAgo && <span className="news-card-time">{safeTimeAgo}</span>}
        </div>

        <h3 className="news-card-title">{safeTitle}</h3>
        <button className="news-card-more" onClick={(e) => e.preventDefault()}>
          <span>•••</span>
        </button>
      </div>
    </a>
  );
};

export default memo(NewsCard);
