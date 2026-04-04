import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import MovieCard from '../components/movies/MovieCard';
import DetailsModal from '../components/movies/DetailsModal';
import FactCard from '../components/dashboard/FactCard';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/layout/Footer';
import api from '../utils/api';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);
  const [anime, setAnime] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMovie, setActiveMovie] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('login');

  // ... (keep search and effect logic)
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
      api.get('/anime/trending'),
      api.get('/battles/leaderboard'),
    ])
      .then(([tResult, aResult, lResult]) => {
        if (tResult.status === 'fulfilled' && Array.isArray(tResult.value.data)) {
          setTrending(tResult.value.data.slice(0, 8));
        }
        if (aResult.status === 'fulfilled' && Array.isArray(aResult.value.data)) {
          setAnime(aResult.value.data.slice(0, 8));
        }
        if (lResult.status === 'fulfilled' && Array.isArray(lResult.value.data)) {
          setLeaderboard(lResult.value.data.slice(0, 5));
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
        <section className="container" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
          
          {/* 🔥 DYNAMIC TRIVIA CARD */}
          <FactCard />

          <div className="dashboard-header animate-up" style={{ marginBottom: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '2.4rem', fontWeight: '900', marginBottom: '12px', letterSpacing: '-1.5px' }}>
                Welcome back, <span className="text-gradient" style={{ display: 'inline' }}>{user.username}</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Your personal archive is awaiting further curation.</p>
            </div>
            
            <div className="dashboard-lottie hide-mobile" style={{ width: '150px' }}>
              <lottie-player 
                src="https://assets2.lottiefiles.com/packages/lf20_T6v6t6.json"
                background="transparent"
                speed="1"
                style={{ width: '150px', height: '150px' }}
                loop
                autoplay>
              </lottie-player>
            </div>
          </div>
          
          <div className="section-header">
            <h2 className="section-title">Trending for Members</h2>
            <Link to="/search" className="btn btn-ghost btn-sm">Explore All →</Link>
          </div>

          {/* 🔮 AI CINEMATIC ORACLE SECTION */}
          <section className="oracle-section glass-card animate-up" style={{ marginBottom: '60px', padding: '40px', overflow: 'hidden', position: 'relative' }}>
            <div className="oracle-bg-glow" />
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '40px' }}>
              <div className="oracle-lottie hide-mobile">
                <lottie-player 
                  src="https://assets1.lottiefiles.com/packages/lf20_9aa8vbs6.json"
                  background="transparent" speed="1" 
                  style={{ width: '180px', height: '180px' }} 
                  loop autoplay>
                </lottie-player>
              </div>
              <div style={{ flex: 1 }}>
                <span className="oracle-label">PREMIUM FEATURE</span>
                <h2 style={{ fontSize: '2.4rem', fontWeight: '800', marginBottom: '16px', color: '#fff', letterSpacing: '-1px' }}>
                  The <span className="text-gradient">Cinematic Oracle</span> is active.
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', marginBottom: '24px', maxWidth: '600px', lineHeight: '1.6' }}>
                  Use our advanced Gemini-powered AI to discover hidden gems, analyze complex theories, or find your next favorite masterpiece. Click the floating bot below to begin your consultation.
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div className="oracle-pulse-dot" />
                  <span style={{ fontSize: '0.9rem', color: '#B48EAD', fontWeight: '800', letterSpacing: '1px' }}>AI SYSTEM ONLINE</span>
                </div>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="spinner" />
          ) : (
            <div className="movies-grid animate-up">
              {trending?.map((item) => (
                <MovieCard key={item.id} item={{ ...item, media_type: 'movie' }} onClick={setActiveMovie} />
              ))}
            </div>
          )}

          {/* ✨ SPOTLIGHT: ANIME */}
          <div className="section-header" style={{ marginTop: '60px' }}>
            <h2 className="section-title">Spotlight: Anime</h2>
            <Link to="/anime" className="btn btn-ghost btn-sm">Full Archive →</Link>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : (
            <div className="movies-grid animate-up">
              {anime?.map((item) => (
                <MovieCard key={item.id} item={item} onClick={setActiveMovie} />
              ))}
            </div>
          )}
        </section>

        {activeMovie && <DetailsModal item={activeMovie} onClose={() => setActiveMovie(null)} />}

        <section className="container leaderboard-preview animate-up" style={{ paddingTop: '60px', paddingBottom: '80px' }}>
          <div className="section-header" style={{ marginBottom: '32px' }}>
            <h2 className="section-title">Notable Collections</h2>
            <Link to="/leaderboard" className="btn btn-ghost btn-sm">Full Rankings →</Link>
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
                  <span className="lb-meta">{u.battle_wins} Duels · {u.watchlist_size} Titles</span>
                </div>
                <span className="lb-points">{u.total_points} pts</span>
              </div>
            ))}
          </div>
        </section>
        
        <Footer />
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

        <div className="container hero-content-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <div className="hero-content" style={{ flex: 1.2 }}>
            <p className="hero-eyebrow animate-up" style={{ color: '#B48EAD', fontWeight: '700' }}>Film · Series · Community</p>

            <h1 className="hero-title animate-up">
              Your cinematic<br />
              <span className="text-gradient">universe,</span> curated.
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
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Joined by 500+ film lovers</span>
            </div>
          </div>

          {/* 🔥 HERO LOTTIE ANIMATION */}
          <div className="hero-animation hide-mobile animate-fade" style={{ flex: 0.8, display: 'flex', justifyContent: 'center' }}>
            <lottie-player 
              src="https://assets.lottiefiles.com/packages/lf20_x62chJ.json"
              background="transparent"
              speed="1"
              style={{ width: '450px', height: '450px' }}
              loop
              autoplay>
            </lottie-player>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────── */}
      <section className="container features-section animate-up" style={{ animationDelay: '0.4s' }}>
        <div className="features-grid">
          <div className="feature-card glass-card">
            <div className="feature-icon">
              <lottie-player 
                src="https://assets9.lottiefiles.com/packages/lf20_pucia9k5.json"
                style={{ width: '60px', height: '60px', marginBottom: '20px' }}
                loop
                autoplay>
              </lottie-player>
            </div>
            <h3>Curate Your Archive</h3>
            <p>Your cinematic journey, preserved. Build a living history of the films that moved you and the scenes you'll never forget.</p>
          </div>
          <div className="feature-card glass-card">
            <div className="feature-icon">
              <lottie-player 
                src="https://assets3.lottiefiles.com/packages/lf20_sk5h17nd.json"
                style={{ width: '60px', height: '60px', marginBottom: '20px' }}
                loop
                autoplay>
              </lottie-player>
            </div>
            <h3>Voice Your Perspective</h3>
            <p>Go beyond the star rating. Share nuanced reviews and thoughtful critiques that contribute to the global cinematic dialogue.</p>
          </div>
          <div className="feature-card glass-card">
            <div className="feature-icon">
              <lottie-player 
                src="https://assets10.lottiefiles.com/packages/lf20_jtS7n0.json"
                style={{ width: '60px', height: '60px', marginBottom: '20px' }}
                loop
                autoplay>
              </lottie-player>
            </div>
            <h3>Connect through Cinema</h3>
            <p>Exchange collections with fellow cinephiles. Discover new favorites through thoughtful comparisons and community insights.</p>
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

      <Footer />

      {/* ── AUTH MODAL ───────────────────────────────────────── */}
      <AuthModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultMode={modalMode}
      />
    </div>
  );
}