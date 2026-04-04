import './Footer.css';

const Footer = () => {
  return (
    <footer className="brand-footer">
      <div className="container footer-content">
        <div className="footer-brand-section">
          <div className="footer-logo">
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
              <li><a href="mailto:orlune.support@gmail.com">Contact Us</a></li>
              <li className="support-email">orlune.support@gmail.com</li>
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
