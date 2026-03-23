import { useState, useEffect } from 'react';
import './Sports.css';

/**
 * Apple News-style Sports Section
 * Shows live scores, team selection, and sports news
 */
const Sports = () => {
  const [selectedSport, setSelectedSport] = useState('all');
  const [favoriteTeams, setFavoriteTeams] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [sportStories, setSportStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const sports = [
    { id: 'all', name: 'All Sports', icon: '⚡' },
    { id: 'nfl', name: 'NFL', icon: '🏈' },
    { id: 'nba', name: 'NBA', icon: '🏀' },
    { id: 'mlb', name: 'MLB', icon: '⚾' },
    { id: 'nhl', name: 'NHL', icon: '🏒' },
    { id: 'soccer', name: 'Soccer', icon: '⚽' },
    { id: 'ncaa', name: 'NCAA', icon: '🎓' }
  ];

  const teams = [
    { 
      id: 'dal', 
      name: 'Dallas Cowboys', 
      logo: '⭐', 
      sport: 'nfl',
      colors: ['#041E42', '#869397']
    },
    { 
      id: 'nyy', 
      name: 'NY Yankees', 
      logo: 'NY', 
      sport: 'mlb',
      colors: ['#003087', '#E4002C']
    },
    { 
      id: 'den', 
      name: 'Denver Nuggets', 
      logo: '⛰️', 
      sport: 'nba',
      colors: ['#0E2240', '#FEC524']
    }
  ];

  useEffect(() => {
    fetchSportsData();
    // Refresh every 30 seconds for live scores
    const interval = setInterval(fetchSportsData, 30000);
    return () => clearInterval(interval);
  }, [selectedSport]);

  const fetchSportsData = async () => {
    try {
      // Fetch live games and sports news
      const response = await fetch('/.netlify/functions/rss-aggregator?type=news&category=sports');
      const data =await response.json();
      
      if (data && data.data) {
        setSportStories(data.data.slice(0, 10));
      }
      
      // Mock live games (in production, integrate with ESPN API or similar)
      setLiveGames(getMockLiveGames());
    } catch (error) {
      console.error('Error fetching sports data:', error);
      setLiveGames(getMockLiveGames());
      setSportStories(getFallbackStories());
    } finally {
      setLoading(false);
    }
  };

  const getMockLiveGames = () => [
    {
      id: 1,
      sport: 'nba',
      homeTeam: { name: 'GSW', fullName: 'Golden State Warriors', score: 107, logo: '🔷' },
      awayTeam: { name: 'NYK', fullName: 'New York Knicks', score: 110, logo: '🟠' },
      status: 'FINAL',
      time: 'Today',
      quarter: 'Final'
    },
    {
      id: 2,
      sport: 'nba',
      homeTeam: { name: 'WSH', fullName: 'Washington Wizards', score: 16, logo: '🔴' },
      awayTeam: { name: 'GSW', fullName: 'Golden State Warriors', score: 35, logo: '🔷' },
      status: 'Q1',
      time: '4:00 PM',
      quarter: '3:16'
    },
    {
      id: 3,
      sport: 'nhl',
      homeTeam: { name: 'DET', fullName: 'Detroit Red Wings', score: 23, logo: '🔴' },
      awayTeam: { name: 'CGY', fullName: 'Calgary Flames', score: 8, logo: '🔥' },
      status: 'LIVE',
      time: '4:00 PM',
      quarter: 'P2 15:23'
    }
  ];

  const getFallbackStories = () => [
    {
      title: 'How Team USA shut down the competition',
      image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80',
      source: 'ESPN',
      timeAgo: '1h ago'
    }
  ];

  const toggleFavoriteTeam = (teamId) => {
    setFavoriteTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const filteredGames = selectedSport === 'all' 
    ? liveGames 
    : liveGames.filter(game => game.sport === selectedSport);

  return (
    <section className="sports-section">
      <div className="sports-header">
        <h1 className="sports-title">Sports</h1>
        <button className="sports-more-btn">
          <span>•••</span>
        </button>
      </div>

      {/* Favorite Teams */}
      <div className="favorite-teams">
        <div className="teams-scroll">
          {teams.map(team => (
            <button
              key={team.id}
              className={`team-badge ${favoriteTeams.includes(team.id) ? 'active' : ''}`}
              onClick={() => toggleFavoriteTeam(team.id)}
              style={{
                backgroundImage: favoriteTeams.includes(team.id) 
                  ? `linear-gradient(135deg, ${team.colors[0]}, ${team.colors[1]})` 
                  : 'none'
              }}
            >
              <span className="team-logo">{team.logo}</span>
            </button>
          ))}
          <button className="team-badge add-team">
            <span className="team-logo">+</span>
          </button>
        </div>
        <button className="pick-teams-btn">Pick Your Teams</button>
      </div>

      {/* Sport Filter Tabs */}
      <div className="sport-tabs">
        {sports.map(sport => (
          <button
            key={sport.id}
            className={`sport-tab ${selectedSport === sport.id ? 'active' : ''}`}
            onClick={() => setSelectedSport(sport.id)}
          >
            <span className="sport-icon">{sport.icon}</span>
            {sport.name}
          </button>
        ))}
      </div>

      {/* Live Games */}
      {filteredGames.length > 0 && (
        <div className="live-games">
          <div className="section-label">
            <span className="live-indicator"></span>
            LIVE & UPCOMING
          </div>
          
          <div className="games-grid">
            {filteredGames.map(game => (
              <div key={game.id} className={`game-card ${game.status.toLowerCase()}`}>
                <div className="game-time">{game.time}</div>
                
                <div className="game-matchup">
                  <div className="team away">
                    <span className="team-logo-large">{game.awayTeam.logo}</span>
                    <div className="team-info">
                      <div className="team-abbr">{game.awayTeam.name}</div>
                      <div className="team-record">{game.sport === 'nba' ? '32-35' : '16-50'}</div>
                    </div>
                    <div className="team-score">{game.awayTeam.score}</div>
                  </div>
                  
                  <div className="team home">
                    <span className="team-logo-large">{game.homeTeam.logo}</span>
                    <div className="team-info">
                      <div className="team-abbr">{game.homeTeam.name}</div>
                      <div className="team-record">{game.sport === 'nba' ? '16-50' : '23-8'}</div>
                    </div>
                    <div className="team-score">{game.homeTeam.score}</div>
                  </div>
                </div>
                
                <div className="game-status">
                  {game.status === 'FINAL' ? (
                    <span className="status-badge final">FINAL</span>
                  ) : game.status === 'LIVE' ? (
                    <span className="status-badge live">
                      <span className="live-dot"></span>
                      {game.quarter}
                    </span>
                  ) : (
                    <span className="status-badge upcoming">{game.quarter}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Stories */}
      <div className="sports-stories">
        <h3 className="stories-title">Top Stories</h3>
        <p className="stories-subtitle">Selected by the Apple News editors.</p>
        
        {loading ? (
          <div className="sports-loading">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="stories-grid">
            {sportStories.map((story, index) => (
              <a 
                key={index}
                href={story.url || story.link || '#'}
                className="sport-story-card"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="story-image-container">
                  <img 
                    src={story.image || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80'} 
                    alt={story.title}
                    className="story-image"
                  />
                </div>
                <div className="story-content">
                  <h4 className="story-title">{story.title}</h4>
                  <div className="story-meta">
                    {story.source || 'ESPN'} · {story.timeAgo || '1h ago'}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Sports;
