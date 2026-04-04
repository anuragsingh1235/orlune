import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import MovieCard from '../components/movies/MovieCard';
import FactCard from '../components/dashboard/FactCard'; // 🔥 NEW
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
    Promise.allSettled([
      api.get('/movies/trending'),
      api.get('/battles/leaderboard'),
    ])
      .then(([tResult, lResult]) => {
        if (tResult.status === 'fulfilled' && Array.isArray(tResult.value.data)) {
          setTrending(tResult.value.data);
        } else if (tResult.status === 'rejected') {
          console.error('Trending fetch failed:', tResult.reason);
        }
        if (lResult.status === 'fulfilled' && Array.isArray(lResult.value.data)) {
          setLeaderboard(lResult.value.data.slice(0, 5));
        } else if (lResult.status === 'rejected') {
          console.error('Leaderboard fetch failed:', lResult.reason);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const openLogin = () => { setModalMode('login'); setModalOpen(true); };
  const openRegister = () => { setModalMode('register'); setModalOpen(true); };

  if (user) {
    // ── DASHBOARD VIEW (LOGGED IN) ──
    return (
      <div className="home-page dashboard-view animate-fade">
        <section className="container" style={{ paddingTop: '120px', paddingBottom: '20px' }}>
          
          {/* 🔥 DYNAMIC TRIVIA CARD */}
          <FactCard />

          <div className="dashboard-header animate-up" style={{ marginBottom: '60px' }}>
            <h1 style={{ fontSize: '2.4rem', fontWeight: '900', marginBottom: '12px', letterSpacing: '-1.5px' }}>
              Welcome back, <span className="text-gradient" style={{ display: 'inline' }}>{user.username}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Your cinematic world is ready. Check out the latest ranks.</p>
          </div>
          
          <div className="section-header">
            <h2 className="section-title">Trending for Members</h2>
            <Link to="/search" className="btn btn-ghost btn-sm">Explore All →</Link>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : (
            <div className="movies-grid animate-up">
              {trending?.map((item) => (
                <MovieCard key={item.id} item={{ ...item, media_type: 'movie' }} />
              ))}
            </div>
          )}
        </section>

        <section className="container leaderboard-preview animate-up" style={{ paddingTop: '60px', paddingBottom: '80px' }}>
          <div className="section-header" style={{ marginBottom: '32px' }}>
            <h2 className="section-title">The Honor Roll</h2>
            <Link to="/leaderboard" className="btn btn-ghost btn-sm">Full Board →</Link>
          </div>

          <div className="lb-list glass-card" style={{ padding: '8px' }}>
            {leaderboard?.map((u, i) => (
              <div key={u.id} className="lb-row" style={{ border: 'none', background: 'transparent' }}>
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
      </div>
    );
  }

  // ── LANDING SPLASH VIEW (LOGGED OUT) ──
  return (
    <div className="home-page landing-view animate-fade">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-glow" />

        <div className="container hero-content">
          <p className="hero-eyebrow animate-up">Film · Series · Community</p>

          <h1 className="hero-title animate-up">
            Your cinematic<br />
            <span>universe,</span> curated.
          </h1>

          <p className="hero-subtitle animate-up" style={{ animationDelay: '0.1s' }}>
            Discover what to watch next. Track every film you've seen.
            Share your taste with people who genuinely care about cinema.
          </p>

          <div className="hero-actions animate-up" style={{ animationDelay: '0.2s', marginTop: '10px' }}>
            <button className="btn-join" onClick={openRegister} style={{ padding: '16px 36px', fontSize: '1rem' }}>
              <span className="btn-join-orb" />
              Join the Community
            </button>
            <button className="btn-signin" onClick={openLogin} style={{ marginLeft: '12px' }}>
              Sign in
            </button>
          </div>

          <div className="hero-proof animate-up" style={{ animationDelay: '0.3s' }}>
            <div className="proof-faces">
              {['A','K','R','M','S'].map((l, i) => (
                <div key={i} className="proof-face" style={{ '--i': i }}>{l}</div>
              ))}
            </div>
            <span>Joined by 500+ film lovers</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────── */}
      <section className="container features-section animate-up" style={{ animationDelay: '0.4s' }}>
        <div className="features-grid">
          <div className="feature-card glass-card">
            <div className="feature-icon">◎</div>
            <h3>Track Everything</h3>
            <p>Build your personal watchlist. Log what you've seen, what's next, and what you want to remember.</p>
          </div>
          <div className="feature-card glass-card">
            <div className="feature-icon">◈</div>
            <h3>Rate & Review</h3>
            <p>Give films the rating they deserve. Write honest reviews. Your opinion shapes your recommendations.</p>
          </div>
          <div className="feature-card glass-card">
            <div className="feature-icon">⊹</div>
            <h3>Battle It Out</h3>
            <p>Challenge others to compare watchlists. Defend your taste. Discover films through friendly debate.</p>
          </div>
        </div>
      </section>

      {/* ── SNEAK PEEK (GATED TRENDING) ─────────── */}
      <section className="container trending-section" style={{ paddingBottom: '60px', marginTop: '80px' }}>
        <div className="section-header" style={{ justifyContent: 'center', marginBottom: '40px' }}>
          <h2 className="section-title">See what the community is watching</h2>
        </div>

        <div className="movies-grid" style={{ filter: 'blur(3px) grayscale(30%)', opacity: 0.5, pointerEvents: 'none' }}>
          {trending?.slice(0, 4).map((item) => (
            <MovieCard key={item.id} item={{ ...item, media_type: 'movie' }} />
          ))}
        </div>

        <div className="content-gate" style={{ marginTop: '-180px' }}>
          <div className="gate-blur" style={{ height: '220px' }} />
          <div className="gate-inner">
            <p className="gate-title">Ready to dive in?</p>
            <p className="gate-sub">Sign in to browse thousands of movies and build your ultimate watchlist.</p>
            <button className="btn-join" onClick={openRegister}>Join — it's free</button>
          </div>
        </div>
      </section>

      {/* ── GATED LEADERBOARD PREVIEW ──────────────────── */}
      <section className="container leaderboard-preview" style={{ paddingBottom: '120px', marginTop: '40px' }}>
        <div className="section-header" style={{ justifyContent: 'center', marginBottom: '32px' }}>
          <h2 className="section-title">Top Critics & Collectors</h2>
        </div>

        <div className="lb-list-gate" style={{ position: 'relative' }}>
          <div className="lb-list" style={{ filter: 'blur(4px)', opacity: 0.4, pointerEvents: 'none' }}>
            {[1, 2, 3].map((u, i) => (
              <div key={i} className="lb-row">
                <span className="lb-rank">🥇</span>
                <div className="lb-avatar">?</div>
                <div className="lb-info">
                  <span className="lb-name">Hidden Member</span>
                  <span className="lb-meta">Join to see stats</span>
                </div>
                <span className="lb-points">0 pts</span>
              </div>
            ))}
          </div>
          
          <div className="content-gate" style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <button className="btn btn-primary" onClick={openLogin} style={{ padding: '12px 24px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                Sign In to See Ranks
             </button>
          </div>
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