import { useEffect, useState } from 'react';
import MovieCard from '../components/movies/MovieCard';
import api from '../utils/api';

/**
 * ─── ANIME PAGE (Jikan API Integration) ──────────────────────────
 * A dedicated high-end gallery for trending anime content, 
 * utilizing the same 'Orlune' visual language.
 */
export default function Anime() {
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/anime/trending')
      .then(res => setAnime(res.data))
      .catch(err => console.error('Anime fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="anime-page container animate-fade" style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: '60px', textAlign: 'center' }}>
        <h1 className="page-title text-gradient">✨ The <span>Anime Archive</span></h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '16px auto' }}>
          Explore the world's most acclaimed animated series and films, 
          curated by the Orlune community.
        </p>
      </header>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="movies-grid animate-up">
          {anime.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {anime.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          The archive is currently being updated. Please check back soon.
        </div>
      )}
    </div>
  );
}
