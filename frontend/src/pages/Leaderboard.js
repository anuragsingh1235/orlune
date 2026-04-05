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

  const [sentRequests, setSentRequests] = useState([]);

  const sendRequest = async (targetId) => {
    try {
      await api.post('/social/request', { receiverId: targetId });
      setSentRequests(prev => [...prev, targetId]);
    } catch (err) {
      console.error("Failed to send request:", err);
    }
  };

  const medals = ['🥇', '🥈', '🥉'];

  // ... (Gated view logic remains the same inside original file)
  if (!user) {
    return (
      <div className="leaderboard-page container animate-fade" style={{ textAlign: 'center', paddingBottom: '100px' }}>
        <h1 className="page-title text-gradient">🏆 The <span>Collector's Circle</span></h1>
        
        <div className="lb-gate-hero glass-card animate-scale" style={{ 
          maxWidth: '600px', 
          margin: '40px auto', 
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div className="lb-gate-icon" style={{ fontSize: '48px' }}>✨</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Exclusive for the Community</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            To view the full global standings and history of our most dedicated collectors, 
            you must be a part of the Orlune network.
          </p>
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            <Link to="/register" className="btn btn-primary btn-lg">Join the Battle</Link>
            <Link to="/login" className="btn btn-secondary btn-lg">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page container animate-fade">
      <h1 className="page-title text-gradient">🏆 Global <span>Standings</span></h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: '0.95rem' }}>
        Top-tier members ranked by their cinematic contributions and community standing.
      </p>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="lb-table glass-card animate-up" style={{ padding: '8px' }}>
          <div className="lb-thead">
            <span>Rank</span>
            <span>Cinephile</span>
            <span>Contributions</span>
            <span>Record</span>
            <span>Social</span>
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
              <div className="lb-social-cell" style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '12px' }}>
                {u.id !== user?.id && (
                  sentRequests.includes(u.id) ? (
                    <button className="btn-social sent" disabled>Requested</button>
                  ) : (
                    <button className="btn-social" onClick={() => sendRequest(u.id)}>+ Connect</button>
                  )
                )}
              </div>
            </div>
          )) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No members found in the archive yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
