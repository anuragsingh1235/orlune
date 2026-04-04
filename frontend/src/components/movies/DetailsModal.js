import { useEffect, useState } from 'react';
import api from '../../utils/api';
import './DetailsModal.css';

/**
 * ─── DETAILS MODAL (AIRA Cinematic View) ───────────────────────
 * Displays trailers, cast, and details for any title.
 * The backend already fetches the trailerId server-side via YouTube API,
 * so we just display what it returns.
 */
export default function DetailsModal({ item, onClose, hideTrailer }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Lock scroll when modal is open
    document.body.style.overflow = 'hidden';

    // Choose the right backend endpoint
    const endpoint = item.media_type === 'anime'
      ? `/anime/details/${item.id}`
      : `/movies/details/${item.id}?type=${item.media_type || 'movie'}`;

    api.get(endpoint)
      .then((res) => {
        setDetails({ ...res.data, hideTrailer });
      })
      .catch((err) => {
        console.error('Details fetch failed:', err);
        setError('Could not load details. Please try again.');
      })
      .finally(() => setLoading(false));

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [item]);

  if (!item) return null;

  return (
    <div className="modal-overlay animate-fade" onClick={onClose}>
      <div className="modal-content glass-card animate-scale" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        {loading ? (
          <div className="modal-loader"><div className="spinner" /></div>
        ) : error ? (
          <div className="modal-error">{error}</div>
        ) : details ? (
          <div className="details-layout">

            {/* 🎥 CINEMATIC PLAYER SECTION */}
            <div className="trailer-container">
              {!details.hideTrailer && (details.activeVideoId || details.trailerId || details.relatedScenes?.[0]?.id || details.fanVideos?.[0]?.id) ? (
                <iframe
                  key={details.activeVideoId || details.trailerId || details.relatedScenes?.[0]?.id || details.fanVideos?.[0]?.id}
                  className="trailer-iframe"
                  src={`https://www.youtube.com/embed/${details.activeVideoId || details.trailerId || details.relatedScenes?.[0]?.id || details.fanVideos?.[0]?.id}?autoplay=1&rel=0`}
                  title="Cinematic Discovery"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div
                  className="no-trailer"
                  style={{
                    backgroundImage: item.poster_path
                      ? `url(https://image.tmdb.org/t/p/w780${item.poster_path})`
                      : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="no-trailer-overlay">
                    <span>{details.hideTrailer ? 'Legacy Record Locked' : '🎬 Cinematic Preview coming soon'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 🎑 EXPLORATION TABS */}
            {!details.hideTrailer && (details.relatedScenes?.length > 0 || details.fanVideos?.length > 0 || details.trailerId) && (
              <div className="scenes-selector animate-up">
                <div className="scenes-header">
                   <h4>Cinematic Exploration</h4>
                   <span>Discover Trailers, Iconic Moments & Community Hub</span>
                </div>
                
                <div className="scenes-grid">
                  {[ 
                    ...(details.trailerId ? [{ id: details.trailerId, title: 'Official Trailer', type: 'Official' }] : []), 
                    ...(details.relatedScenes || []).map(s => ({ ...s, type: 'Epic Moment' })),
                    ...(details.fanVideos || []).map(s => ({ ...s, type: 'Creator Fan-Edit' }))
                  ].map((scene, idx) => (
                    <div 
                      key={idx} 
                      className={`scene-card ${ (details.activeVideoId || details.trailerId || details.relatedScenes?.[0]?.id || details.fanVideos?.[0]?.id) === scene.id ? 'active' : '' }`}
                      onClick={() => setDetails({ ...details, activeVideoId: scene.id })}
                    >
                      <img src={scene.thumbnail || `https://img.youtube.com/vi/${scene.id}/mqdefault.jpg`} alt={scene.title} />
                      <div className="scene-overlay">
                         <span className="scene-type-tag">{scene.type}</span>
                         <p>{scene.title.length > 35 ? scene.title.slice(0, 35) + '...' : scene.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 📝 INFO SECTION */}
            <div className="details-body">
              <h2 className="details-title">{details.title || details.name || item.title || item.name}</h2>

              <div className="details-meta">
                {details.vote_average > 0 && (
                  <span className="rating-badge">★ {Number(details.vote_average).toFixed(1)}</span>
                )}
                {(details.release_date || details.first_air_date) && (
                  <span className="year-badge">
                    {(details.release_date || details.first_air_date || '').slice(0, 4)}
                  </span>
                )}
                {details.status && <span className="status-badge">{details.status}</span>}
                {details.episodes && <span className="status-badge">{details.episodes} eps</span>}
                {details.runtime && <span className="status-badge">{details.runtime}</span>}
              </div>

              {/* Genres */}
              {(details.genres || details.genre_ids || []).length > 0 && (
                <div className="details-genres">
                  {(details.genres || details.genre_ids || []).map((g, i) => (
                    <span key={i} className="genre-tag">
                      {typeof g === 'object' ? g.name : g}
                    </span>
                  ))}
                </div>
              )}

              <p className="details-overview">{details.overview || 'No overview available.'}</p>

              {/* Cast / Studio */}
              <div className="details-grid">
                {details.credits?.cast?.length > 0 && (
                  <div className="grid-item">
                    <h4>Leading Cast</h4>
                    <p>{details.credits.cast.slice(0, 4).map((c) => c.name).join(', ')}</p>
                  </div>
                )}
                {details.director && details.director !== 'N/A' && (
                  <div className="grid-item">
                    <h4>Director</h4>
                    <p>{details.director}</p>
                  </div>
                )}
                {details.studios?.length > 0 && (
                  <div className="grid-item">
                    <h4>Studio</h4>
                    <p>{details.studios.join(', ')}</p>
                  </div>
                )}
                {details.actors && details.actors !== 'N/A' && (
                  <div className="grid-item">
                    <h4>Actors</h4>
                    <p>{details.actors}</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="modal-error">Title not found in the archive.</div>
        )}
      </div>
    </div>
  );
}
