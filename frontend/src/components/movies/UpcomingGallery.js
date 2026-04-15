import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import MovieCard from './MovieCard';
import './UpcomingGallery.css';

export default function UpcomingGallery({ onSelect }) {
  const [movies, setMovies] = useState([]);
  const [wikiSearch, setWikiSearch] = useState('');
  const [wikiResults, setWikiResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'wiki'

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const fetchUpcoming = async () => {
    setLoading(true);
    try {
      const res = await api.get('/movies/upcoming');
      setMovies(Array.isArray(res.data) ? res.data.slice(0, 10) : []);
    } catch (e) {}
    setLoading(false);
  };

  const handleWikiSearch = async (e) => {
    e.preventDefault();
    if (!wikiSearch.trim()) return;
    setSearching(true);
    setActiveTab('wiki');
    try {
      const res = await api.get(`/wiki/search?query=${encodeURIComponent(wikiSearch)}`);
      setWikiResults(res.data.results || []);
    } catch (e) {}
    setSearching(false);
  };

  return (
    <div className="upcoming-gallery-root animate-up">
      <div className="ug-header">
        <div className="ug-tabs">
          <button className={`ug-tab ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
            📅 Upcoming Premieres
          </button>
          <button className={`ug-tab ${activeTab === 'wiki' ? 'active' : ''}`} onClick={() => setActiveTab('wiki')}>
            🌐 Wikipedia Search
          </button>
        </div>

        <form className="ug-search-bar" onSubmit={handleWikiSearch}>
          <input 
            type="text" 
            placeholder="Search Wikipedia for release dates..." 
            value={wikiSearch}
            onChange={(e) => setWikiSearch(e.target.value)}
          />
          <button type="submit" disabled={searching}>
            {searching ? '...' : '🔍'}
          </button>
        </form>
      </div>

      <div className="ug-content">
        {activeTab === 'upcoming' && (
          loading ? <div className="spinner" /> : (
            <div className="ug-grid">
              {movies.map(m => (
                <div key={m.id} className="ug-card-wrapper">
                  <MovieCard item={m} onClick={onSelect} />
                  <div className="ug-release-badge">Rel: {m.release_date || 'TBA'}</div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'wiki' && (
          searching ? <div className="spinner" /> : (
            <div className="wiki-results-list">
              {wikiResults.length > 0 ? wikiResults.map(p => (
                <div key={p.id} className="wiki-item glass-card" onClick={() => window.open(`https://en.wikipedia.org/?curid=${p.id}`, '_blank')}>
                   {p.thumbnail && <img src={p.thumbnail} alt="" className="wiki-thumb" />}
                   <div className="wiki-info">
                      <h3>{p.title}</h3>
                      <p className="wiki-overview">{p.overview?.slice(0, 180)}...</p>
                      <div className="wiki-meta">Source: Wikipedia • Released: (Tap for detail)</div>
                   </div>
                </div>
              )) : <div className="ug-empty">No Wikipedia records found. Search for a specific movie title.</div>}
            </div>
          )
        )}
      </div>
    </div>
  );
}
