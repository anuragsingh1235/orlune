import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: '/', label: 'Home' },
    { to: '/search', label: 'Search' },
    { to: '/watchlist', label: 'Watchlist' },
    { to: '/battles', label: 'Battles' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* 🔥 PREMIUM BRAND */}
        <Link to="/" className="navbar-brand">
          <img src="/logo.png" alt="Orlune" className="logo" />
          <span className="brand-text">ORLUNE</span>
        </Link>

        {/* LINKS */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link ${isActive(l.to) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* RIGHT */}
        <div className="navbar-right">
          {user ? (
            <div className="user-menu">
              <Link to="/profile" className="user-chip">
                <div className="user-avatar">
                  {user.username?.[0]?.toUpperCase()}
                </div>
                <span>{user.username}</span>
              </Link>

              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-ghost">Login</Link>
              <Link to="/register" className="btn-primary">Sign Up</Link>
            </div>
          )}

          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

      </div>
    </nav>
  );
}