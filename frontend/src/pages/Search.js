import { useCallback, useEffect, useState } from 'react';
import MovieCard from '../components/movies/MovieCard';
import DetailsModal from '../components/movies/DetailsModal';
import api from '../utils/api';
import './Search.css';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [activeMovie, setActiveMovie] = useState(null);
  const [error, setError] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const doSearch = useCallback(async (q, p) => {
    if (!q.trim()) return;

    setLoading(true);
    if (p === 1) {
      setInsight(null);
      getAIInsight(q);
    }

    try {
      const res = await api.get(`/movies/search?q=${encodeURIComponent(q)}`);
      const searchResults = Array.isArray(res.data) ? res.data : [];

      setResults(prev =>
        p === 1 ? searchResults : [...prev, ...searchResults]
      );

      // Backend doesn't paginate — disable load more if fewer than 20 results
      setTotalPages(searchResults.length >= 20 ? p + 1 : p);

    } catch (err) {
      console.error('SEARCH ERROR:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAIInsight = async (q) => {
    if (q.length < 3) return;
    setInsightLoading(true);
    try {
      const { data } = await api.post('/ai/oracle', { 
        prompt: `Provide a very concise, 2-sentence professional cinematic insight about "${q}". If it has a release date or upcoming season (like Season 4), mention it specifically. Keep it elite and high-authority.`,
        history: [] 
      });
      setInsight(data.reply);
    } catch (err) {
      console.error('AI Insight Error:', err);
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        setPage(1);
        doSearch(query, 1);
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    doSearch(query, next);
  };

  return (
    <div className="search-page container animate-fade">
      
      {/* 🔮 HERO SECTION */}
      <section className="search-hero">
        <h1 className="page-title text-gradient">
          Everything <span>Starts</span> with a Search.
        </h1>
        
        <div className="search-bar-wrap glass-card">
          <input
            className="search-input"
            placeholder="Search movies, actors, or themes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />

          {query && (
            <button
              className="clear-btn"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
            >
              ✕
            </button>
          )}
        </div>

        {!query && (
          <div className="search-hints animate-up">
            <p className="hints-title">Popular Cinema</p>
            <div className="hints-list">
              {['Avengers', 'Inception', 'Dune', 'Batman', 'Interstellar'].map((h, i) => (
                <button
                  key={h}
                  className="hint-chip"
                  onClick={() => setQuery(h)}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 🔮 RESULTS & AI INSIGHTS AREA */}
      {loading && page === 1 ? (
        <div className="spinner" style={{ marginTop: 40 }} />
      ) : query ? (
        <div className="animate-up">
          
          {/* 🤖 AIRA INSIGHT CARD */}
          {(insight || insightLoading) && (
            <div className="aira-insight-wrapper">
              <div className="aira-insight-card glass-card">
                <div className="aira-label">
                  <div className="aira-pulse"></div>
                  AIRA Intelligence
                </div>
                {insightLoading ? (
                  <div className="aira-loading">
                    <div className="aira-dots"><span></span><span></span><span></span></div>
                    Consulting the Cinematic Archives...
                  </div>
                ) : (
                  <div className="aira-content">
                    <p>{insight}</p>
                    <div className="aira-footer">Verification complete via Gemini 2.0 Oracle</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {results?.length > 0 ? (
            <>
              <div className="results-header">
                <p className="results-count">
                  Showing {results.length} discoveries for "<strong>{query}</strong>"
                </p>
              </div>

              <div className="movies-grid">
                {results.map((item, index) => (
                  <div 
                    key={`${item.id}-${index}`} 
                    className="movie-stagger" 
                    style={{ animationDelay: `${(index % 10) * 0.05}s`, animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                  >
                    <MovieCard
                      item={{ ...item, media_type: 'movie' }}
                      onClick={setActiveMovie}
                    />
                  </div>
                ))}
              </div>

              {page < totalPages && (
                <div style={{ textAlign: 'center', marginTop: 48 }}>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? 'Discovering...' : 'See More Records'}
                  </button>
                </div>
              )}
            </>
          ) : !loading && query && !insightLoading && !insight ? (
            <div className="empty-state">
              <div className="icon">🌓</div>
              <h3>No records found in the archive</h3>
              <p>Try searching for a broad title or different year.</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeMovie && <DetailsModal item={activeMovie} onClose={() => setActiveMovie(null)} />}
    </div>
  );
}