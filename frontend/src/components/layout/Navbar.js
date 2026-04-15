import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [menuOpen]);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/search', label: 'Search' },
    { to: '/anime', label: 'Anime' },
    { to: '/watchlist', label: 'Watchlist' },
    { to: '/battles', label: 'Gallery' },
    { to: '/features', label: 'Features' },
    { to: '/social', label: 'Social' },
    { to: '/leaderboard', label: 'Rankings' },
    { to: '/lab', label: 'Lab' },
    { to: '/trivia', label: 'Trivia' },
  ];

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${menuOpen ? 'menu-is-open' : ''}`}>
      <div className="navbar-inner container">
        
        {/* 🔥 PURE SVG BRAND LOGO */}
        <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
          <div className="brand-icon">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Premium Shutter Logo */}
              <defs>
                <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fff" />
                  <stop offset="100%" stopColor="#81A1C1" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="48" stroke="url(#brand-grad)" strokeWidth="1.5" strokeDasharray="4 2"/>
              <path d="M50 20L55 45L80 50L55 55L50 80L45 55L20 50L45 45L50 20Z" fill="url(#brand-grad)" />
              <circle cx="50" cy="50" r="8" fill="var(--bg-primary)" stroke="url(#brand-grad)" strokeWidth="2"/>
              <circle cx="50" cy="50" r="3" fill="url(#brand-grad)"/>
            </svg>
          </div>
          <span className="brand-text">ORLUNE</span>
        </Link>

        {/* DESKTOP LINKS */}
        <div className="navbar-desktop-links">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link ${isActive(l.to) ? 'active' : ''}`}
            >
              {l.label}
              {isActive(l.to) && <span className="active-dot" />}
            </Link>
          ))}
        </div>

        {/* RIGHT AREA */}
        <div className="navbar-right">
          <div className="desktop-auth">
            {user ? (
              <div className="user-menu">
                <Link to="/profile" className="user-chip">
                  <div className="user-avatar">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="dp" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : user.username?.[0]?.toUpperCase()
                    }
                  </div>
                  <span>{user.username}</span>
                </Link>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn-link">Sign In</Link>
                <Link to="/register" className="btn-nav-primary">Join Free</Link>
              </div>
            )}
          </div>

          <button 
            className={`hamburger ${menuOpen ? 'is-active' : ''}`} 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="hamburger-box">
              <span className="hamburger-inner"></span>
            </span>
          </button>
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      <div className={`mobile-overlay ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          <div className="mobile-links">
            {links.map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                className={`mobile-link ${isActive(l.to) ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                {l.label}
              </Link>
            ))}
          </div>
          
          <div className="mobile-auth-section">
            {user ? (
              <div className="mobile-user-info">
                <Link to="/profile" className="mobile-user-card" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                  <div className="user-avatar large">
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt="dp" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      : user.username?.[0]?.toUpperCase()
                    }
                  </div>
                  <div className="user-details">
                    <span className="user-name">{user.username}</span>
                    <span className="user-email">{user.email}</span>
                  </div>
                </Link>
                <button onClick={handleLogout} className="mobile-logout-btn">
                  Logout from Account
                </button>
              </div>
            ) : (
              <div className="mobile-auth-btns">
                <Link to="/register" className="btn-full primary" onClick={() => setMenuOpen(false)}>Create Account</Link>
                <Link to="/login" className="btn-full secondary" onClick={() => setMenuOpen(false)}>Sign In</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}