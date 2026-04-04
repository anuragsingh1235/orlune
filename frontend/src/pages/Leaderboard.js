import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Leaderboard.css';

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/battles/leaderboard')
      .then((r) => {
        if (Array.isArray(r.data)) {
          setData(r.data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  // 🔒 GATED VIEW FOR GUESTS
  if (!user) {
    return (
      <div className="leaderboard-page container page-header-offset animate-fade" style={{ textAlign: 'center', paddingBottom: '100px' }}>
        <h1 className="page-title text-gradient">🏆 Member <span>Hall of Fame</span></h1>
        
        <div className="lb-gate-hero glass-card animate-scale" style={{ 
          maxWidth: '600px', 
          margin: '40px auto', 
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div className="lb-gate-icon" style={{ fontSize: '48px' }}>🔐</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Ranks are Reserved for Warriors</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            To protect our community's competitive integrity and view the full global rankings, 
            you must be a registered member of Orlune.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            <Link to="/register" className="btn btn-primary btn-lg">Join the Battle</Link>
            <Link to="/login" className="btn btn-secondary btn-lg">Sign In</Link>
          </div>
        </div>

        {/* Blurred Teaser */}
        <div className="lb-table" style={{ filter: 'blur(8px) grayscale(50%)', opacity: 0.3, pointerEvents: 'none' }}>
          <div className="lb-thead">
            <span>#</span>
            <span>User</span>
            <span>Points</span>
            <span>W / L</span>
            <span>Films</span>
          </div>
          {[1, 2, 3, 4, 5].map((_, i) => (
             <div key={i} className="lb-trow">
               <span className="lb-pos">#{i+1}</span>
               <div className="lb-user-cell"><div className="lb-av">?</div><p className="lb-uname">Hidden Warrior</p></div>
               <span className="lb-pts">???? pts</span>
             </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page container page-header-offset animate-fade">
      <h1 className="page-title text-gradient">🏆 Global <span>Leaderboard</span></h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '0.95rem' }}>
        Top warriors ranked by points earned from battles and cinematic activity.
      </p>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="lb-table glass-card animate-up" style={{ padding: '8px' }}>
          <div className="lb-thead">
            <span>Rank</span>
            <span>Warrior</span>
            <span>Total Points</span>
            <span>Record</span>
            <span>Archive</span>
          </div>
          {data.length > 0 ? data.map((u, i) => (
            <div key={u.id} className={`lb-trow ${u.id === user?.id ? 'is-me' : ''}`}>
              <span className="lb-pos">
                {i < 3 ? medals[i] : <em style={{ fontStyle: 'normal', opacity: 0.5 }}>#{i + 1}</em>}
              </span>
              <div className="lb-user-cell">
                <div className="lb-av" style={{ background: u.id === user?.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {u.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="lb-uname">{u.username} {u.id === user?.id ? <span className="you-tag">YOU</span> : ''}</p>
                </div>
              </div>
              <span className="lb-pts">{u.total_points} <small style={{ opacity: 0.5 }}>pts</small></span>
              <span className="lb-wl">
                <span className="win">{u.battle_wins}W</span> / <span className="loss">{u.battle_losses}L</span>
              </span>
              <span className="lb-films">{u.watchlist_size} <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>titles</span></span>
            </div>
          )) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No warriors found in the archive yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
