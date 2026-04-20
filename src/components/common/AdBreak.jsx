import './AdBreak.css';

/**
 * Apple News-style Ad Break Component
 * Clean, minimal ad placement between content sections
 */
const AdBreak = ({ type = 'standard', sponsor }) => {
  const content = sponsor ? (
    <div className="sponsored-content">
      <div className="sponsor-label">Sponsored Content</div>
      <div className="sponsor-name">{sponsor}</div>
    </div>
  ) : (
    <div className="ad-placeholder-content">
      <div className="ad-label">Advertisement</div>
      <div className="ad-box-inner">
        <div className="ad-icon">📢</div>
        <div className="ad-text">Your Ad Here</div>
        <div className="ad-sub">728 × 90 · Leaderboard</div>
      </div>
    </div>
  );

  if (type === 'sidebar') {
    return (
      <div className="ad-break sidebar">
        <div className="ad-label">Advertisement</div>
        <div className="ad-sidebar-inner">
          {sponsor ? (
            <div className="sponsored-content">
              <div className="sponsor-label">Sponsored</div>
              <div className="sponsor-name">{sponsor}</div>
            </div>
          ) : (
            <>
              <div className="ad-icon">📢</div>
              <div className="ad-text">Your Ad Here</div>
              <div className="ad-sub">300 × 250</div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`ad-break ${type}`}>
      <div className="ad-container">
        {content}
      </div>
    </div>
  );
};

export default AdBreak;
