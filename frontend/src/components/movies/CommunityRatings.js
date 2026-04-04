import { useEffect, useState } from 'react';
import api from '../../utils/api';
import './CommunityRatings.css';

export default function CommunityRatings() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/watchlist/community/scores')
      .then(res => setScores(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" style={{ margin: '60px auto' }} />;

  return (
    <div className="cr-page animate-fade">
      <header className="cr-header">
        <h2 className="text-gradient">🏛️ Global <span>Heritage Scores</span></h2>
        <p className="cr-sub">The collective cinematic record of the Orlune community.</p>
      </header>

      {scores.length === 0 ? (
        <div className="empty-state">
           <p>The global archive is waiting for its first masterpiece.</p>
        </div>
      ) : (
        <div className="cr-grid">
          {scores.map((s, idx) => (
            <div key={idx} className="cr-card glass-card animate-up" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="cr-rank">#{idx + 1}</div>
              <div className="cr-poster-wrap">
                  <img src={s.poster_path ? (s.poster_path.startsWith('http') ? s.poster_path : `https://image.tmdb.org/t/p/w200${s.poster_path}`) : 'https://via.placeholder.com/200x300'} alt={s.title} className="cr-poster" />
              </div>
              <div className="cr-info">
                  <h3 className="cr-title">{s.title}</h3>
                  <div className="cr-stats">
                      <div className="cr-stat">
                          <span className="cr-stat-val">★ {parseFloat(s.avg_community_rating).toFixed(1)}</span>
                          <span className="cr-stat-label">Community Score</span>
                      </div>
                      <div className="cr-stat">
                          <span className="cr-stat-val">👤 {s.total_ratings}</span>
                          <span className="cr-stat-label">Contributors</span>
                      </div>
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
