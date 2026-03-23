import './AdBreak.css';

/**
 * Apple News-style Ad Break Component
 * Clean, minimal ad placement between content sections
 */
const AdBreak = ({ type = 'standard', sponsor }) => {
  return (
    <div className={`ad-break ${type}`}>
      <div className="ad-container">
        {sponsor ? (
          <div className="sponsored-content">
            <div className="sponsor-label">Sponsored Content</div>
            <div className="sponsor-name">{sponsor}</div>
          </div>
        ) : (
          <div className="ad-placeholder-content">
            <div className="ad-icon">📢</div>
            <div className="ad-text">Advertisement</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdBreak;
