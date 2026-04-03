import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Leaderboard.css';

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/battles/leaderboard').then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="leaderboard-page container">
      <h1 className="page-title">🏆 Global <span>Leaderboard</span></h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Top warriors ranked by points earned from battles and activity</p>

      {loading ? <div className="spinner" /> : (
        <div className="lb-table">
          <div className="lb-thead">
            <span>#</span>
            <span>User</span>
            <span>Points</span>
            <span>W / L</span>
            <span>Films</span>
          </div>
          {data.map((u, i) => (
            <div key={u.id} className={`lb-trow ${u.id === user?.id ? 'is-me' : ''}`}>
              <span className="lb-pos">
                {i < 3 ? medals[i] : <em>#{i + 1}</em>}
              </span>
              <div className="lb-user-cell">
                <div className="lb-av" style={{ background: u.id === user?.id ? 'var(--accent)' : '#4a4a6a' }}>
                  {u.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="lb-uname">{u.username} {u.id === user?.id ? <span className="you-tag">You</span> : ''}</p>
                </div>
              </div>
              <span className="lb-pts">{u.total_points} <small>pts</small></span>
              <span className="lb-wl">
                <span className="win">{u.battle_wins}W</span> / <span className="loss">{u.battle_losses}L</span>
              </span>
              <span className="lb-films">{u.watchlist_size} 🎬</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
