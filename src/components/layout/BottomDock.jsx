import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faPlus, faPlay, faBookmark, faUser } from '@fortawesome/free-solid-svg-icons';
import './BottomDock.css';

/**
 * Apple News-style Bottom Dock Navigation
 * Replaces hamburger menu on mobile
 */
const BottomDock = () => {
  const location = useLocation();

  const navItems = [
    { 
      path: '/', 
      icon: faNewspaper, 
      label: 'Today',
      color: '#FF2D55'
    },
    { 
      path: '/news', 
      icon: faPlus, 
      label: 'Sections',
      color: '#007AFF'
    },
    { 
      path: '/podcasts', 
      icon: faPlay, 
      label: 'Media',
      color: 'var(--accent-color)'
    },
    { 
      path: '/following', 
      icon: faBookmark, 
      label: 'Following',
      color: '#FF9500'
    },
    { 
      path: '/dashboard', 
      icon: faUser, 
      label: 'Profile',
      color: '#32ADE6',
      matchPaths: ['/dashboard']
    }
  ];

  return (
    <nav className="bottom-dock">
      <div className="bottom-dock-container">
        {navItems.map((item) => {
          const isActive = (item.matchPaths || [item.path]).some((path) => location.pathname.startsWith(path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`bottom-dock-item ${isActive ? 'active' : ''}`}
              style={{ '--item-color': item.color }}
            >
              <div className="bottom-dock-icon">
                <FontAwesomeIcon icon={item.icon} />
              </div>
              <span className="bottom-dock-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomDock;
