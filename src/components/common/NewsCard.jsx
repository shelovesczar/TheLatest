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
  const safeTimeAgo  = safeStr(timeAgo);
  const safeCategory = safeStr(category);
  const safeImage    = safeStr(image);
  const safeUrl      = safeStr(url);

  // Guard: don't render broken cards — prevents crashes from malformed API data
  if (!safeTitle) return null;

  return (
    <a 
      href={safeUrl || '#'} 
      className={`news-card ${featured ? 'featured' : ''}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="news-card-image-container">
        <LazyImage
          src={safeImage || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80'}
          alt={safeTitle}
          className="news-card-image"
        />
        <div className="news-card-overlay"></div>
        
        {safeCategory && (
          <div className="news-card-badge">{safeCategory}</div>
        )}
      </div>
      
      <div className="news-card-content">
        <h3 className="news-card-title">{safeTitle}</h3>
        <div className="news-card-meta">
          <span className="news-card-source">{safeSource}</span>
          {safeTimeAgo && <span className="news-card-time">{safeTimeAgo}</span>}
        </div>
        <button className="news-card-more" onClick={(e) => e.preventDefault()}>
          <span>•••</span>
        </button>
      </div>
    </a>
  );
};

export default NewsCard;
