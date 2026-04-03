import { useCallback, useEffect, useState } from 'react';
import MovieCard from '../components/movies/MovieCard';
import api from '../utils/api';
import './Search.css';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]); // ✅ always array
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const doSearch = useCallback(async (q, p) => {
    if (!q.trim()) return;

    setLoading(true);
    try {
      const res = await api.get(`/movies/search?q=${encodeURIComponent(q)}`);
      const results = Array.isArray(res.data) ? res.data : [];

      setResults(prev =>
        p === 1 ? results : [...prev, ...results]
      );

      // Backend doesn't paginate — disable load more if fewer than 20 results
      setTotalPages(results.length >= 20 ? p + 1 : p);

    } catch (err) {
      console.error('SEARCH ERROR:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
    <div className="search-page container">
      <h1 className="page-title">
        🔍 Search <span>Movies</span>
      </h1>

      <div className="search-bar-wrap">
        <input
          className="input search-input"
          placeholder="Search for movies..."
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

      {/* 🔥 LOADING */}
      {loading && page === 1 ? (
        <div className="spinner" />
      ) : results?.length > 0 ? (

        <>
          <p className="results-count">
            {results.length} results for "<strong>{query}</strong>"
          </p>

          <div className="movies-grid-lg">
            {results.map((item) => (
              <MovieCard
                key={item.id}
                item={{ ...item, media_type: 'movie' }}
              />
            ))}
          </div>

          {page < totalPages && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button
                className="btn btn-secondary"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>

      ) : query ? (

        <div className="empty-state">
          <div className="icon">🎬</div>
          <h3>No results found</h3>
          <p>Try a different search term</p>
        </div>

      ) : (

        <div className="search-hints">
          <p className="hints-title">Popular searches</p>
          <div className="hints-list">
            {['Avengers', 'Inception', 'Dune', 'Batman', 'Interstellar'].map((h) => (
              <button
                key={h}
                className="hint-chip"
                onClick={() => setQuery(h)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

      )}
    </div>
  );
}