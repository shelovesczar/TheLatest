import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ContentFilter from '../components/common/ContentFilter';
import NewsCard from '../components/common/NewsCard';
import LoginModal from '../components/layout/LoginModal';
import './FollowingPage.css';

/**
 * Following Page - Shows content from followed sources/topics
 * Now includes navigation to SOCIAL MEDIA, OPINIONS, VIDEOS, PODCASTS, and LOGIN
 */
const FollowingPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [followedContent, setFollowedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const followedSources = [
    'Saved Recipes',
    'Shared with You',
    'Saved Stories',
    'History'
  ];

  const mainNavSections = [
    { icon: '📱', name: 'SOCIAL MEDIA', path: '/social', color: '#FF2D55' },
    { icon: '💭', name: 'OPINIONS', path: '/opinions', color: '#5856D6' },
    { icon: '🎬', name: 'VIDEOS', path: '/videos', color: '#AF52DE' },
    { icon: '🎧', name: 'PODCASTS', path: '/podcasts', color: '#FFD60A' },
  ];

  const sections = [
    { icon: '📖', name: 'Saved Recipes' },
    { icon: '👥', name: 'Shared with You' },
    { icon: '🔖', name: 'Saved Stories' },
    { icon: '🕐', name: 'History' },
  ];

  useEffect(() => {
    fetchContent();
  }, [filter]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      // Fetch based on filter
      const url = filter === 'following' 
        ? '/.netlify/functions/rss-aggregator?type=news' // Would filter by followed sources
        : '/.netlify/functions/rss-aggregator?type=news';
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && Array.isArray(data.data)) {
        // Normalise every item: coerce RSS XML objects ({_,  $}) to plain strings
        const toStr = (v) => {
          if (!v) return '';
          if (typeof v === 'string') return v;
          if (typeof v === 'object' && typeof v._ === 'string') return v._;
          return String(v);
        };
        const safe = data.data
          .filter(item => item && typeof item === 'object' && item.title)
          .slice(0, 20)
          .map(item => ({
            ...item,
            title:       toStr(item.title),
            source:      toStr(item.source || item.sourceName),
            timeAgo:     toStr(item.timeAgo || item.publishedAt || item.pubDate),
            image:       toStr(item.image || item.urlToImage),
            url:         toStr(item.url || item.link),
            category:    toStr(item.category),
            description: toStr(item.description),
          }));
        setFollowedContent(safe);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="following-page">
      <div className="following-header">
        <h1 className="page-title">
          <span className="apple-icon">📰</span>
          News
        </h1>
        <h2 className="page-subtitle">Following</h2>
        <button className="edit-btn">Edit</button>
      </div>

      {/* Main Navigation Sections */}
      <div className="main-nav-sections">
        {mainNavSections.map((section, index) => (
          <button
            key={index}
            className="main-nav-item"
            onClick={() => navigate(section.path)}
            style={{ '--nav-color': section.color }}
          >
            <div className="main-nav-icon">{section.icon}</div>
            <div className="main-nav-label">{section.name}</div>
          </button>
        ))}
        
        {/* Login Button */}
        <button
          className="main-nav-item login-nav-item"
          onClick={() => setShowLoginModal(true)}
          style={{ '--nav-color': '#34C759' }}
        >
          <div className="main-nav-icon">👤</div>
          <div className="main-nav-label">LOGIN</div>
        </button>
      </div>

      {/* Quick Access Sections */}
      <div className="quick-sections">
        {sections.map((section, index) => (
          <div key={index} className="section-item">
            <div className="section-icon">{section.icon}</div>
            <div className="section-name">{section.name}</div>
          </div>
        ))}
      </div>

      {/* Sections Header */}
      <div className="sections-header">
        <h3>Sections</h3>
        <button className="expand-btn">∨</button>
      </div>

      {/* Section Categories */}
      <div className="section-categories">
        {['Academy Awards', 'Sports', 'Puzzles', 'Politics', 'Business', 'Food'].map((cat, i) => (
          <div key={i} className="category-item">
            <div className="category-icon">{getCategoryIcon(cat)}</div>
            <div className="category-name">{cat}</div>
          </div>
        ))}
      </div>

      {/* Channels & Topics */}
      <div className="sections-header">
        <h3>Channels & Topics</h3>
        <button className="expand-btn">∨</button>
      </div>

      <div className="channels-list">
        <div className="channel-item">
          <div className="channel-icon">📺</div>
          <div className="channel-info">
            <div className="channel-name">Channel Name</div>
            <div className="channel-meta">Following</div>
          </div>
        </div>
      </div>

      {/* Content Filter */}
      <ContentFilter 
        onFilterChange={(newFilter) => setFilter(newFilter)}
        defaultFilter={filter}
      />

      {/* Content Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="content-grid">
          {followedContent.map((item, index) => (
            <NewsCard
              key={index}
              title={item.title}
              image={item.image}
              source={item.source}
              timeAgo={item.timeAgo || item.publishedAt}
              url={item.url || item.link}
              category={item.category}
            />
          ))}
        </div>
      )}
      
      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
};

function getCategoryIcon(category) {
  const icons = {
    'Academy Awards': '🏆',
    'Sports': '⚽',
    'Puzzles': '🧩',
    'Politics': '🏛️',
    'Business': '💼',
    'Food': '🍽️'
  };
  return icons[category] || '📰';
}

export default FollowingPage;
