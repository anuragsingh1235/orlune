import { useEffect, useState } from 'react';
import api from '../../utils/api';
import './DetailsModal.css';

/**
 * ─── DETAILS MODAL (Orlune Cinematic View) ───────────────────────
 * A high-end modal that displays trailers, detailed cast,
 * and narrative overviews for any title in the archive.
 */
export default function DetailsModal({ item, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Disable scroll on body when modal is open
    document.body.style.overflow = 'hidden';

    // Fetch deep details based on API source
    const endpoint = item.media_type === 'anime' 
      ? `/anime/details/${item.id}` 
      : `/movies/details/${item.id}?type=${item.media_type || 'movie'}`;

    api.get(endpoint)
      .then(async (res) => {
        let detailsData = res.data;
        if (!detailsData.trailerId) {
          const title = detailsData.title || detailsData.name || item.title || item.name;
          try {
            const q = encodeURIComponent(`${title} official trailer`);
            const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&key=AIzaSyDqbhKLXam6nnY9pzSMwhj89ZpocCEzZrY&maxResults=1&type=video`);
            const ytData = await ytRes.json();
            if (ytData.items && ytData.items.length > 0) {
              detailsData.trailerId = ytData.items[0].id.videoId;
            }
          } catch(err) {
            console.error('Youtube fetch error:', err);
          }
        }
        setDetails(detailsData);
      })
      .catch(err => console.error('Details fetch fail:', err))
      .finally(() => setLoading(false));

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [item]);

  if (!item) return null;

  return (
    <div className="modal-overlay animate-fade" onClick={onClose}>
      <div className="modal-content glass-card animate-scale" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        {loading ? (
          <div className="modal-loader"><div className="spinner" /></div>
        ) : details ? (
          <div className="details-layout">
            
            {/* 🎥 TRAILER SECTION */}
            <div className="trailer-container">
              {details.trailerId ? (
                <iframe
                  className="trailer-iframe"
                  src={`https://www.youtube.com/embed/${details.trailerId}?autoplay=1`}
                  title="Official Trailer"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="no-trailer" style={{ backgroundImage: `url(${item.poster_path})` }}>
                  <span>Trailer coming soon to the archive.</span>
                </div>
              )}
            </div>

            {/* 📝 DATA SECTION */}
            <div className="details-body">
              <h2 className="details-title">{details.title || details.name}</h2>
              <div className="details-meta">
                <span className="rating-badge">★ {details.vote_average?.toFixed(1)}</span>
                <span className="year-badge">{details.release_date?.slice(0, 4)}</span>
                {details.status && <span className="status-badge">{details.status}</span>}
              </div>

              <div className="details-genres">
                {(details.genres || details.genre_ids || []).map((g, i) => (
                  <span key={i} className="genre-tag">{typeof g === 'object' ? g.name : g}</span>
                ))}
              </div>

              <p className="details-overview">{details.overview}</p>

              {/* CAST / INFO GRID */}
              <div className="details-grid">
                {details.credits?.cast && (
                  <div className="grid-item">
                    <h4>Leading Cast</h4>
                    <p>{details.credits.cast.slice(0, 3).map(c => c.name).join(', ')}</p>
                  </div>
                )}
                {details.studios && (
                  <div className="grid-item">
                    <h4>Production Studio</h4>
                    <p>{details.studios.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="modal-error">The narrative of this title is currently locked.</div>
        )}
      </div>
    </div>
  );
}
