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
    if (!user) { toast.error('Login to add to Vault'); return; }
    
    // 🛡️ Prevent re-adding masterpieces
    if (item.status === 'completed') {
      toast('This masterpiece is already in your archive.', { icon: '✨' });
      return;
    }

    setAdding(true);
    try {
      await api.post('/watchlist', {
        tmdb_id: item.id,
        media_type: mediaType,
        title,
        poster_path: poster,
        backdrop_path: item.backdrop_path,
        overview: item.overview,
        release_date: item.release_date || item.first_air_date,
        vote_average: item.vote_average,
        genres: item.genre_ids?.join(',') || '',
      });
      toast.success(`Vaulted "${title}"!`);
      if (onAdd) onAdd(item);
    } catch (err) {
      if (err.response?.status === 409) toast('Already in your Vault', { icon: '📦' });
      else toast.error('Failed to vault');
    } finally {
      setAdding(false);
    }
  };

  const statusLabel = item.status === 'completed' ? 'Mastered' : item.status === 'watching' ? 'Watching' : 'Found';
  const timeInfo = item.status === 'completed' 
    ? `Mastered ${new Date(item.completed_at).toLocaleDateString()}`
    : item.status === 'watching'
      ? `Started ${getTimeAgo(item.started_at)}`
      : `Vaulted ${getTimeAgo(item.created_at)}`;

  return (
    <div className="movie-card" onClick={() => onClick && onClick(item)}>
      <div className="movie-poster-wrap">
        <img src={poster} alt={title} className="movie-poster" loading="lazy" />
        <div className="movie-overlay" onClick={(e) => e.stopPropagation()}>
          {user && !showStatus && item.status !== 'completed' && (
            <button className="add-btn" onClick={handleAdd} disabled={adding}>
              {adding ? '...' : '+ Vault'}
            </button>
          )}
          {item.status === 'completed' && !showStatus && (
            <div className="completed-check animate-fade">✨ Mastered</div>
          )}
        </div>
        {rating && (
          <div className="movie-rating">
            <span>★</span> {rating}
          </div>
        )}
        {/* 🔥 Always show status badge if it exists (for global awareness) */}
        {item.status && (
          <div className={`movie-status-badge status-${item.status}`}>
            <span className="status-icon" />
            {statusLabel}
          </div>
        )}
      </div>
      <div className="movie-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <p className="movie-title">{title}</p>
            {item.status && (
              <span className="time-meta">
                {item.status === 'completed' && item.completed_at ? `Mastered ${new Date(item.completed_at).toLocaleDateString()}` :
                 item.status === 'watching' && item.started_at ? `Watching for ${getTimeAgo(item.started_at)}` :
                 item.created_at ? `Vaulted ${getTimeAgo(item.created_at)}` : ''}
              </span>
            )}
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
