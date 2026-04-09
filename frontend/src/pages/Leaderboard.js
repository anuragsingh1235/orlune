import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Leaderboard.css';

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendsList, setFriendsList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [justFollowed, setJustFollowed] = useState([]);

  useEffect(() => {
    api.get('/battles/leaderboard')
      .then(r => { if (Array.isArray(r.data)) setData(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));

    if (user) {
      api.get('/social/friends').then(res => setFriendsList(Array.isArray(res.data) ? res.data.map(f => f.id) : [])).catch(console.error);
      api.get('/social/following').then(res => setFollowingList(Array.isArray(res.data) ? res.data.map(f => f.id) : [])).catch(console.error);
    }
  }, [user]);

  const followUser = async (targetId) => {
    try {
      await api.post('/social/follow', { followingId: targetId });
      setJustFollowed(prev => [...prev, targetId]);
      toast.success('Following!');
    } catch (err) {
      toast.error('Could not follow');
    }
  };

  const tierColors = [
    'linear-gradient(135deg, #FFD700, #FFA500)',
    'linear-gradient(135deg, #C0C0C0, #A0A0A0)',
    'linear-gradient(135deg, #CD7F32, #A0522D)',
  ];

  if (!user) {
    return (
      <div className="leaderboard-page container animate-fade" style={{ textAlign: 'center' }}>
        <div className="lb-hero">
          <div className="lb-hero-glow" />
          <h1 className="lb-hero-title">🏆 Top <span className="text-gradient">Ranked</span></h1>
          <p className="lb-hero-sub">See who dominates the watchlist scene. Join to claim your spot.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 32 }}>
            <Link to="/register" className="btn btn-primary btn-lg">Join Free</Link>
            <Link to="/login" className="btn btn-secondary btn-lg">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page container animate-fade">
      <div className="lb-hero">
        <div className="lb-hero-glow" />
        <h1 className="lb-hero-title">🏆 Top <span className="text-gradient">Ranked</span></h1>
        <p className="lb-hero-sub">Community members ranked by their cinematic impact.</p>
      </div>

      {loading ? (
        <div className="spinner" style={{ marginTop: 60 }} />
      ) : (
        <div className="lb-list-wrap">
          {data.length > 0 ? data.map((u, i) => {
            const isFollowing = followingList.includes(u.id) || justFollowed.includes(u.id);
            const isFriend = friendsList.includes(u.id);

            return (
              <div key={u.id} className={`lb-card ${u.id === user?.id ? 'lb-card-me' : ''}`} style={{ animationDelay: `${i * 40}ms` }}>
                {/* Rank */}
                <div className="lb-rank">
                  {i < 3 ? (
                    <div className="lb-medal" style={{ background: tierColors[i] }}>{i + 1}</div>
                  ) : (
                    <span className="lb-rank-num">#{i + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="lb-avatar-cell">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.username} className="lb-av-img" />
                  ) : (
                    <div className="lb-av-initial" style={{ background: u.id === user?.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)' }}>
                      {u.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="lb-info">
                  <div className="lb-name">
                    {u.username}
                    {u.id === user?.id && <span className="you-tag">YOU</span>}
                  </div>
                  <div className="lb-meta">
                    <span className="lb-pts-inline">⭐ {u.total_points} pts</span>
                    <span className="lb-wins">{u.watchlist_size || 0} watched</span>
                  </div>
                </div>

                {/* Action */}
                <div className="lb-action">
                  {u.id !== user?.id && (
                    isFriend ? (
                      <button className="lb-btn lb-btn-friends" disabled>✓ Friends</button>
                    ) : isFollowing ? (
                      <button className="lb-btn lb-btn-pending" disabled>Following</button>
                    ) : (
                      <button className="lb-btn lb-btn-add" onClick={() => followUser(u.id)}>+ Follow</button>
                    )
                  )}
                </div>
              </div>
            );
          }) : (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No players found yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
