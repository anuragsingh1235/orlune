import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import './MovieCard.css';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w342';

const getTimeAgo = (date) => {
  if (!date) return null;
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "just now";
};

export default function MovieCard({ item, onAdd, onClick, showStatus }) {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);

  const isOmdb = item._api_source === 'omdb';
  const isJikan = item._api_source === 'jikan';

  // OMDB and JIKAN return full poster URLs; TMDB returns a path fragment
  const poster = (isOmdb || isJikan)
    ? (item.poster_path || `https://via.placeholder.com/342x513/1a1a26/ffffff?text=${encodeURIComponent(item.title || item.name)}`)
    : item.poster_path
      ? `${TMDB_IMG}${item.poster_path}`
      : `https://via.placeholder.com/342x513/1a1a26/ffffff?text=${encodeURIComponent(item.title || item.name)}`;

  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const voteAvg = item.vote_average != null ? Number(item.vote_average) : null;
  const rating = voteAvg && !isNaN(voteAvg) ? voteAvg.toFixed(1) : null;
  const mediaType = item.media_type || 'movie';

  const handleAdd = async (e) => {
    e.stopPropagation();
    if (!user) { toast.error('Login to add to watchlist'); return; }
    setAdding(true);
    try {
      await api.post('/watchlist', {
        tmdb_id: item.id,
        media_type: mediaType,
        title,
        poster_path: isOmdb ? item.poster_path : item.poster_path,
        backdrop_path: item.backdrop_path,
        overview: item.overview,
        release_date: item.release_date || item.first_air_date,
        vote_average: item.vote_average,
        genres: item.genre_ids?.join(',') || '',
      });
      toast.success(`Added "${title}" to watchlist!`);
      if (onAdd) onAdd(item);
    } catch (err) {
      if (err.response?.status === 409) toast('Already in your watchlist', { icon: '📋' });
      else toast.error('Failed to add');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="movie-card" onClick={() => onClick && onClick(item)}>
      <div className="movie-poster-wrap">
        <img src={poster} alt={title} className="movie-poster" loading="lazy" />
        <div className="movie-overlay" onClick={(e) => e.stopPropagation()}>
          {user && (
            <button className="add-btn" onClick={handleAdd} disabled={adding}>
              {adding ? '...' : '+ Watchlist'}
            </button>
          )}
        </div>
        {rating && (
          <div className="movie-rating">
            <span>★</span> {rating}
          </div>
        )}
        {showStatus && item.status && (
          <div className={`movie-status-badge status-${item.status}`}>
            <span className="status-icon" />
            {item.status === 'completed' ? 'Mastered' : 'Pending'}
          </div>
        )}
      </div>
      <div className="movie-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <p className="movie-title">{title}</p>
            {item.status === 'completed' && item.completed_at ? (
               <span className="time-meta">Mastered {new Date(item.completed_at).toLocaleDateString()}</span>
            ) : item.created_at ? (
               <span className="time-meta">{getTimeAgo(item.created_at)}</span>
            ) : null}
        </div>
        <p className="movie-meta">{year} {mediaType === 'tv' ? '• TV' : ''}</p>
        {item.heritage_score && (
          <div className="user-rating">
            {'★'.repeat(Math.round(item.heritage_score / 2))} {parseFloat(item.heritage_score).toFixed(1)}/10
          </div>
        )}
      </div>
    </div>
  );
}
