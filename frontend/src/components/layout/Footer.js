import './Footer.css';

const Footer = () => {
  return (
    <footer className="brand-footer">
      <div className="container footer-content">
        <div className="footer-brand-section">
          <div className="footer-logo">
            <svg viewBox="0 0 100 100" fill="none" width="32" height="32" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px' }}>
              <circle cx="50" cy="50" r="48" stroke="#B48EAD" strokeWidth="2" strokeDasharray="4 2"/>
              <path d="M50 20L55 45L80 50L55 55L50 80L45 55L20 50L45 45L50 20Z" fill="#B48EAD" />
            </svg>
            <span className="logo-text">ORLUNE</span>
            <span className="logo-dot">.</span>
          </div>
          <p className="footer-tagline">Architecting Your Cinematic Legacy</p>
        </div>

        <div className="footer-links-section">
          <div className="footer-group">
            <h4>Explore</h4>
            <ul>
              <li><a href="/search">Archive</a></li>
              <li><a href="/anime">Anime</a></li>
              <li><a href="/leaderboard">Critics</a></li>
            </ul>
          </div>
          <div className="footer-group">
            <h4>Community</h4>
            <ul>
              <li><a href="/battles">Trials</a></li>
              <li><a href="/watchlist">Watchlist</a></li>
            </ul>
          </div>
          <div className="footer-group">
            <h4>Support</h4>
            <ul>
              <li><a href="mailto:orlune.support@gmail.com" className="contact-link">Contact Us</a></li>
              <li className="support-email">
                <a href="mailto:orlune.support@gmail.com">orlune.support@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <div className="container bottom-inner">
          <p>&copy; {new Date().getFullYear()} Orlune. All rights preserved.</p>
          <div className="social-links">
            {/* Placeholder for social icons if needed */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
