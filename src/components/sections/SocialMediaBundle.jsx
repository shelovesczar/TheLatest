import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import './SocialMediaBundle.css';

/**
 * Social Media Bundle Component
 * Displays a feed bundle with tabs for different views and a shareable URL
 */
const SocialMediaBundle = ({ bundleUrl = 'https://rss.app/feeds/_LVYomWWGnBBWz7m9.xml', bundleNumber = 2, totalFeeds = 1 }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(bundleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '◉' },
    { id: 'ai-brief', label: 'AI Brief', icon: '✨' },
    { id: 'widgets', label: 'Widgets', icon: '⚙' },
    { id: 'filters', label: 'Filters', icon: '⊙' },
  ];

  return (
    <div className="social-media-bundle">
      <div className="bundle-header">
        <div className="bundle-title-section">
          <h2 className="bundle-title">Social Media</h2>
          <p className="bundle-subtitle">Bundle {bundleNumber} / Feeds</p>
        </div>
      </div>

      <div className="bundle-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`bundle-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bundle-content">
        {activeTab === 'overview' && (
          <div className="tab-content overview-content">
            <p>Active feeds: {totalFeeds}</p>
            <p>This bundle aggregates social media content from multiple sources.</p>
          </div>
        )}

        {activeTab === 'ai-brief' && (
          <div className="tab-content ai-content">
            <p>AI-generated summary of trending topics coming soon.</p>
          </div>
        )}

        {activeTab === 'widgets' && (
          <div className="tab-content widgets-content">
            <p>Embed this feed in your applications using the RSS URL below.</p>
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="tab-content filters-content">
            <p>Customize feed filtering and sorting options.</p>
          </div>
        )}
      </div>

      <div className="bundle-url-section">
        <label className="url-label">Bundle URL</label>
        <div className="url-input-group">
          <input
            type="text"
            value={bundleUrl}
            readOnly
            className="bundle-url-input"
          />
          <button
            className="copy-button"
            onClick={handleCopyUrl}
            title={copied ? 'Copied!' : 'Copy URL'}
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="url-format-label">XML</p>
      </div>
    </div>
  );
};

export default SocialMediaBundle;
