import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import MovieCard from '../components/movies/MovieCard';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');

  // Open modal if redirected from /login or /register
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const auth = params.get('auth');
    if (auth === 'login' || auth === 'register') {
      setModalMode(auth);
      setModalOpen(true);
      navigate('/', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    Promise.all([
      api.get('/movies/trending'),
      api.get('/battles/leaderboard'),
    ])
      .then(([t, l]) => {
        if (Array.isArray(t.data)) setTrending(t.data);
        if (Array.isArray(l.data)) setLeaderboard(l.data.slice(0, 5));
      })
      .catch((err) => console.error('HOME ERROR:', err))
      .finally(() => setLoading(false));
  }, []);

  const openLogin = () => { setModalMode('login'); setModalOpen(true); };
  const openRegister = () => { setModalMode('register'); setModalOpen(true); };

  return (
    <div className="home-page">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-glow" />

        <div className="container hero-content">
          <p className="hero-eyebrow">Film · Series · Community</p>

          <h1 className="hero-title">
            Your cinematic<br />
            <span>universe,</span> curated.
          </h1>

          <p className="hero-subtitle">
            Discover what to watch next. Track every film you've seen.
            Share your taste with people who genuinely care about cinema.
          </p>

          {user ? (
            <div className="hero-actions">
              <Link to="/search" className="btn btn-primary btn-lg">Discover Films</Link>
              <Link to="/battles" className="btn btn-ghost btn-lg">Explore Battles</Link>
            </div>
          ) : (
            <div className="hero-actions">
              <button className="btn-join" onClick={openRegister}>
                <span className="btn-join-orb" />
                Join the Community
              </button>
              <button className="btn-signin" onClick={openLogin}>
                Sign in
              </button>
            </div>
          )}

          {!user && (
            <div className="hero-proof">
              <div className="proof-faces">
                {['A','K','R','M','S'].map((l, i) => (
                  <div key={i} className="proof-face" style={{ '--i': i }}>{l}</div>
                ))}
              </div>
              <span>Joined by 500+ film lovers</span>
            </div>
          )}
        </div>
      </section>

      {/* ── FEATURES (public, visible to everyone) ───────────── */}
      <section className="container features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">◎</div>
            <h3>Track Everything</h3>
            <p>Build your personal watchlist. Log what you've seen, what's next, and what you want to remember.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">◈</div>
            <h3>Rate & Review</h3>
            <p>Give films the rating they deserve. Write honest reviews. Your opinion shapes your recommendations.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⊹</div>
            <h3>Battle It Out</h3>
            <p>Challenge others to compare watchlists. Defend your taste. Discover films through friendly debate.</p>
          </div>
        </div>
      </section>

      {/* ── TRENDING ─────────────────────────────────────────── */}
      <section className="container trending-section">
        <div className="section-header">
          <h2 className="section-title">Trending Now</h2>
          <Link to="/search" className="btn btn-ghost btn-sm">See All →</Link>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="movies-grid">
            {trending?.map((item) => (
              <MovieCard key={item.id} item={{ ...item, media_type: 'movie' }} />
            ))}
          </div>
        )}

        {/* Gate — prompt guests to join */}
        {!user && trending?.length > 0 && (
          <div className="content-gate">
            <div className="gate-blur" />
            <div className="gate-inner">
              <p className="gate-title">See the full picture</p>
              <p className="gate-sub">
                Sign in to add films to your watchlist, rate them,
                and discover what your community is watching.
              </p>
              <button className="btn-join" onClick={openRegister}>
                <span className="btn-join-orb" />
                Join — it's free
              </button>
              <p className="gate-hint">
                Already a member?{' '}
                <button className="am-link" onClick={openLogin}>Sign in</button>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── LEADERBOARD PREVIEW ──────────────────────────────── */}
      <section className="container leaderboard-preview">
        <div className="section-header">
          <h2 className="section-title">Top Members</h2>
          <Link to="/leaderboard" className="btn btn-ghost btn-sm">Full Board →</Link>
        </div>

        <div className="lb-list">
          {leaderboard?.map((u, i) => (
            <div key={u.id} className="lb-row">
              <span className={`lb-rank ${i < 3 ? 'top' : ''}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <div className="lb-avatar">{u.username?.[0]?.toUpperCase()}</div>
              <div className="lb-info">
                <span className="lb-name">{u.username}</span>
                <span className="lb-meta">{u.battle_wins}W · {u.watchlist_size} films</span>
              </div>
              <span className="lb-points">{u.total_points} pts</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── AUTH MODAL ───────────────────────────────────────── */}
      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultMode={modalMode}
      />
    </div>
  );
}