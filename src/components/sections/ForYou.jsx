import { useState, useEffect } from 'react';
import NewsCard from '../common/NewsCard';
import './ForYou.css';

/**
 * Apple News-style "For You" Personalized Section
 * Shows recommendations based on user's reading history and preferences
 */
const ForYou = ({ userId }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      // In production, this would use a recommendation algorithm based on:
      // - User's reading history
      // - Followed topics/sources
      // - Time of day
      // - Trending topics
      
      const response = await fetch('/.netlify/functions/rss-aggregator?type=news');
      const data = await response.json();
      
      if (data && data.data) {
        // For now, show mix of recent + diverse sources
        const recs = data.data.slice(0, 6);
        setRecommendations(recs);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations(getFallbackRecommendations());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackRecommendations = () => [
    {
      title: 'Tech Giants Unveil Revolutionary AI Partnership',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
      source: 'TechCrunch',
      timeAgo: '2h ago',
      category: 'Technology'
    },
    {
      title: 'Climate Summit Reaches Historic Agreement',
      image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800&q=80',
      source: 'Reuters',
      timeAgo: '4h ago',
      category: 'World'
    }
  ];

  if (loading) {
    return (
      <section className="for-you-section">
        <div className="for-you-header">
          <h2 className="for-you-title">For You</h2>
          <p className="for-you-subtitle">Recommendations based on topics & channels you read.</p>
        </div>
        <div className="for-you-loading">
          <div className="spinner"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="for-you-section">
      <div className="for-you-header">
        <h2 className="for-you-title">For You</h2>
        <p className="for-you-subtitle">
          Recommendations based on topics & channels you read.
        </p>
      </div>

      <div className="for-you-grid">
        {recommendations.map((item, index) => (
          <NewsCard
            key={index}
            title={item.title}
            image={item.image}
            source={item.source}
            timeAgo={item.timeAgo || item.publishedAt}
            url={item.url || item.link}
            category={item.category}
            featured={index === 0}
          />
        ))}
      </div>

      <button className="for-you-load-more">
        Load More Recommendations
      </button>
    </section>
  );
};

export default ForYou;
