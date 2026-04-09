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
    return (
      <div className="home-page dashboard-view animate-fade">
        <section className="container" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
          <FactCard />
          <div className="dashboard-header animate-up" style={{ marginBottom: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '2.4rem', fontWeight: '900', marginBottom: '12px', letterSpacing: '-1.5px' }}>
                Welcome back, <span className="text-gradient" style={{ display: 'inline' }}>{user.username}</span>
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Your personal archive is awaiting further curation.</p>
            </div>
            <div className="dashboard-lottie hide-mobile" style={{ width: '150px' }}>
              <lottie-player src="https://assets2.lottiefiles.com/packages/lf20_T6v6t6.json" background="transparent" speed="1" style={{ width: '150px', height: '150px' }} loop autoplay />
            </div>
          </div>
          
          <div className="section-header">
            <h2 className="section-title">Trending for Members</h2>
            <Link to="/search" className="btn btn-ghost btn-sm">Explore All →</Link>
          </div>
          {loading ? <div className="spinner" /> : (
            <div className="movies-grid animate-up">
              {trending?.map((item) => <MovieCard key={item.id} item={{ ...item, media_type: 'movie' }} onClick={setActiveMovie} />)}
            </div>
          )}

          <div className="section-header" style={{ marginTop: '60px' }}>
            <h2 className="section-title">Spotlight: Anime</h2>
            <Link to="/anime" className="btn btn-ghost btn-sm">Full Archive →</Link>
          </div>
          {loading ? <div className="spinner" /> : (
            <div className="movies-grid animate-up">
              {anime?.map((item) => <MovieCard key={item.id} item={item} onClick={setActiveMovie} />)}
            </div>
          )}
        </section>
        {activeMovie && <DetailsModal item={activeMovie} onClose={() => setActiveMovie(null)} hideTrailer={false} />}
        <Footer />
      </div>
    );
  }

  return (
    <div className="home-page landing-splash-view animate-fade">
      <section className="hero-landing">
        <div className="hero-content container">
          <h1 className="hero-title animate-down">
            Master Your <span className="text-gradient">Watcher's Legacy</span>
          </h1>
          <p className="hero-subtitle animate-up">
            The ultimate archive for true cinematic enthusiasts. Track your watchlist, 
            challenge the community in the Gallery, and ascend the rankings.
          </p>
          <div className="hero-cta animate-up">
            <button className="btn btn-primary btn-lg" onClick={openRegister}>Master Your Legacy</button>
            <button className="btn btn-outline btn-lg" onClick={openLogin}>Sign In</button>
          </div>
        </div>
      </section>

      <section className="container leaderboard-preview animate-up" style={{ paddingBottom: '120px', marginTop: '40px' }}>
        <div className="section-header" style={{ justifyContent: 'center', marginBottom: '32px' }}>
          <h2 className="section-title">Top Critics & Collectors</h2>
        </div>
        <div className="lb-list-gate" style={{ position: 'relative' }}>
          <div className="lb-list" style={{ filter: 'blur(4px)', opacity: 0.4, pointerEvents: 'none' }}>
            {[1, 2, 3].map((u, i) => (
              <div key={i} className="lb-row">
                <span className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <div className="lb-avatar">?</div>
                <div className="lb-info"><span className="lb-name">Hidden Member</span></div>
                <span className="lb-points">0 pts</span>
              </div>
            ))}
          </div>
          <div className="content-gate" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <button className="btn btn-primary" onClick={openLogin}>Sign In to See Ranks</button>
          </div>
        </div>
      </section>
      <Footer />
      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} defaultMode={modalMode} />
    </div>
  );
}