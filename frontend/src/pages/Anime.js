import { useEffect, useState, useCallback } from 'react';
import MovieCard from '../components/movies/MovieCard';
import DetailsModal from '../components/movies/DetailsModal';
import api from '../utils/api';
import FactCard from '../components/dashboard/FactCard';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ─── ANIME ARCHIVE (Jikan High-End Integration) ──────────────────
 * A dedicated space for anime fans, featuring trending content 
 * and a specific anime-only search engine. 
 */
export default function Anime() {
  const { user } = useAuth();
  const [anime, setAnime] = useState([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMovie, setActiveMovie] = useState(null);
  const [isSearchResult, setIsSearchResult] = useState(false);

  // ── FETCH TRENDING ────────────────────
  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setIsSearchResult(false);
    try {
      const res = await api.get('/anime/trending');
      setAnime(res.data);
    } catch (err) {
      console.error('Anime trending fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  // ── HANDLE SEARCH ─────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      fetchTrending();
      return;
    }

    setSearching(true);
    try {
      const res = await api.get(`/anime/search?q=${encodeURIComponent(query)}`);
      setAnime(res.data);
      setIsSearchResult(true);
    } catch (err) {
      console.error('Anime search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    fetchTrending();
  };

  return (
    <div className="anime-page container animate-fade" style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 className="page-title text-gradient">✨ The <span>Ancestral Sagas</span></h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '16px auto', fontSize: '1.2rem', fontWeight: '500', fontStyle: 'italic', letterSpacing: '0.2px' }}>
          "Some legends are written in ink, others in stardust. Find the saga that speaks to your soul."
        </p>
      </header>   {/* 🔍 ANIME-ONLY SEARCH BAR */}
        <div className="anime-search-container" style={{ 
          maxWidth: '500px', 
          margin: '32px auto',
          position: 'relative'
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="Search specific anime..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '30px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <button type="submit" className="btn-nav-primary" style={{ padding: '0 24px', borderRadius: '30px' }}>
              Search
            </button>
          </form>
          {isSearchResult && (
            <button 
              onClick={clearSearch} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-muted)', 
                marginTop: '12px', 
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              ← Back to Trending
            </button>
          )}
        </div>

      <div className="section-header" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">
          {searching ? 'Finding...' : isSearchResult ? `Search Results for "${query}"` : 'Trending Now'}
        </h2>
      </div>

      <div style={{ position: 'relative' }}>
        <div className="movies-grid animate-up" style={!user ? { filter: 'blur(4px) grayscale(30%)', opacity: 0.5, pointerEvents: 'none' } : {}}>
          {anime.slice(0, user ? anime.length : 8).map((item) => (
            <MovieCard key={item.id} item={item} onClick={user ? setActiveMovie : undefined} />
          ))}
        </div>

        {!user && (
          <div className="content-gate" style={{ marginTop: '-250px' }}>
            <div className="gate-blur" style={{ height: '300px' }} />
            <div className="gate-inner">
              <p className="gate-title">Ready to dive in?</p>
              <p className="gate-sub">Sign in to browse thousands of anime entries and build your ultimate watchlist.</p>
              <Link to="/login" className="btn-join">Join — it's free</Link>
            </div>
          </div>
        )}
      </div>

      {activeMovie && <DetailsModal item={activeMovie} onClose={() => setActiveMovie(null)} />}

      {user && anime.length === 0 && !(loading || searching) && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          No entries found in the archive matching your request.
        </div>
      )}
    </div>
  );
}
