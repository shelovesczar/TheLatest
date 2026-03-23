import { useState, useEffect, useRef, memo } from 'react';
import './TrendingStories.css';

/**
 * Trending Stories Component
 * Primary: uses stories passed from HomePage (same data already fetched)
 * Fallback: fetches independently if no stories provided
 *
 * Lazy rendering: list items are only painted once the section scrolls into
 * the viewport — reduces initial DOM size and speeds up TTI on long pages.
 */
const TrendingStories = memo(({ stories = [], loading: externalLoading, limit = 10 }) => {
  const [trendingStories, setTrendingStories] = useState([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Intersection Observer — start rendering list only when section enters viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // If IntersectionObserver isn't available (rare), show immediately
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // one-shot — no need to keep watching
        }
      },
      { rootMargin: '200px 0px' } // start loading 200px before it reaches the viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const calculateTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date)) return dateString; // already formatted (e.g. "2h ago")
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Map a raw news item to the shape TrendingStories needs
  const mapStory = (story, index) => ({
    rank: index + 1,
    source: story.source || story.sourceName || 'News',
    title: story.title,
    timeAgo: story.timeAgo || story.time || calculateTimeAgo(story.publishedAt || story.pubDate),
    author: story.author || story.creator || '',
    url: story.url || story.link || '#',
    image: story.image || story.urlToImage || ''
  });

  useEffect(() => {
    if (stories && stories.length > 0) {
      // Use data passed in from parent — no extra fetch needed
      setTrendingStories(
        stories.slice(0, limit).map(mapStory)
      );
    } else if (externalLoading === false) {
      // Parent finished loading but returned nothing — do own fetch
      fetchFallback();
    }
    // If externalLoading is still true, wait for parent
  }, [stories, externalLoading, limit]);

  const fetchFallback = async () => {
    setInternalLoading(true);
    try {
      const response = await fetch('/.netlify/functions/rss-aggregator?type=news');
      const data = await response.json();
      if (data?.data) {
        const sorted = data.data
          .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          .slice(0, limit)
          .map(mapStory);
        setTrendingStories(sorted);
      }
    } catch {
      setTrendingStories(getFallbackTrending());
    } finally {
      setInternalLoading(false);
    }
  };

  const getFallbackTrending = () => [
    { rank: 1, source: 'POPULAR SCIENCE', title: '5 clever iPhone tricks you might not know', timeAgo: '11h ago', author: 'David Nield', url: '#' },
    { rank: 2, source: 'HUFFPOST', title: "So THAT'S Why You Can't Smile In Your Passport Photo", timeAgo: '17h ago', author: 'Caroline Bologna', url: '#' },
    { rank: 3, source: 'TRAVEL + LEISURE', title: '17 Trips You Need to Take as Soon as You Retire', timeAgo: '1d ago', author: 'Patricia Doherty', url: '#' }
  ];

  // Gradient-theme colours cycling through the site's purple→pink palette
  const getNumberColor = (rank) => {
    const colors = [
      '#667eea', // blue-purple
      '#764ba2', // deep purple
      '#f093fb', // pink
      '#9d6ef5', // mid purple
      '#c06ef5', // lavender-pink
      '#5e5ce6', // indigo
      '#8b5cf6', // violet
      '#a855f7', // purple
      '#d946ef', // fuchsia
      '#e879f9', // light fuchsia
    ];
    return colors[(rank - 1) % colors.length];
  };

  const isLoading = externalLoading || internalLoading;

  if (isLoading) {
    return (
      <section className="trending-stories" ref={sectionRef}>
        <div className="section-header">
          <h2 className="section-title">Trending Stories</h2>
        </div>
        <div className="trending-loading">
          <div className="spinner"></div>
        </div>
      </section>
    );
  }

  // Skeleton shown while section is still off-screen
  if (!isVisible) {
    return (
      <section className="trending-stories" ref={sectionRef}>
        <div className="section-header">
          <h2 className="section-title">Trending Stories</h2>
        </div>
        <div className="trending-list">
          {Array.from({ length: Math.min(limit, 5) }).map((_, i) => (
            <div key={i} className="trending-item trending-skeleton">
              <div className="trending-number skeleton-block" style={{ minWidth: 32, height: 32, borderRadius: '50%' }} />
              <div className="trending-content" style={{ flex: 1, gap: 6, display: 'flex', flexDirection: 'column' }}>
                <div className="skeleton-block" style={{ width: '40%', height: 12, borderRadius: 4 }} />
                <div className="skeleton-block" style={{ width: '90%', height: 14, borderRadius: 4 }} />
                <div className="skeleton-block" style={{ width: '30%', height: 11, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="trending-stories" ref={sectionRef}>
      <div className="section-header">
        <h2 className="section-title">Trending Stories</h2>
        <button className="more-button">
          <span>•••</span>
        </button>
      </div>

      <div className="trending-list">
        {trendingStories.map((story) => (
          <a 
            key={story.rank}
            href={story.url || story.link || '#'}
            className="trending-item"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div 
              className="trending-number"
              style={{ backgroundColor: getNumberColor(story.rank) }}
            >
              {story.rank}
            </div>
            <div className="trending-content">
              <div className="trending-source">{story.source}</div>
              <h3 className="trending-title">{story.title}</h3>
              <div className="trending-meta">
                {story.timeAgo} · {story.author || 'Staff'}
              </div>
            </div>
            <button className="trending-more">
              <span>•••</span>
            </button>
          </a>
        ))}
      </div>
    </section>
  );
});

export default TrendingStories;
