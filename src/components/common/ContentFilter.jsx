import { useState } from 'react';
import './ContentFilter.css';

/**
 * Apple News-style All/Following Toggle
 * Filters content between all news and followed sources
 */
const ContentFilter = ({ onFilterChange, defaultFilter = 'all' }) => {
  const [activeFilter, setActiveFilter] = useState(defaultFilter);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  return (
    <div className="content-filter">
      <div className="filter-tabs">
        <button
          className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All
        </button>
        <button
          className={`filter-tab ${activeFilter === 'following' ? 'active' : ''}`}
          onClick={() => handleFilterChange('following')}
        >
          Following
        </button>
        <div 
          className="filter-indicator"
          style={{
            transform: activeFilter === 'following' ? 'translateX(100%)' : 'translateX(0)'
          }}
        />
      </div>
    </div>
  );
};

export default ContentFilter;
