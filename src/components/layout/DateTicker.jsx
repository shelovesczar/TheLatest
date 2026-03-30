import { useState, useEffect } from 'react';
import './DateTicker.css';

/**
 * Apple News-style Date Display and News Ticker
 * Shows current date and scrolling breaking news
 */
const DateTicker = ({ breakingNews = [], sticky = true, label = 'BREAKING', showDate = true }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    // Update date every minute
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Default breaking news
  const defaultNews = [
    "Breaking: Markets reach all-time high",
    "Tech giants announce new AI partnership",
    "Climate summit reaches historic agreement",
    "Sports: Championship game tonight at 8PM ET"
  ];

  const newsItems = breakingNews.length > 0 ? breakingNews : defaultNews;

  return (
    <div className={`date-ticker-container${sticky ? '' : ' is-static'}`}>
      {/* Date Display */}
      {showDate && (
        <div className="date-display">
          <span className="date-text">{formatDate(currentDate)}</span>
        </div>
      )}

      {/* Breaking News Ticker */}
      {newsItems.length > 0 && (
        <div className="news-ticker">
          <div className="ticker-label">
            <span className="ticker-dot"></span>
            {label}
          </div>
          <div className="ticker-content">
            <div className="ticker-wrapper">
              {/* Duplicate for seamless loop */}
              {[...newsItems, ...newsItems].map((item, index) => (
                <span key={index} className="ticker-item">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTicker;
