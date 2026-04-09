import { Link } from 'react-router-dom';
import api from '../utils/api';
import notify from '../utils/notify';
import { useAuth } from '../context/AuthContext';
import './Battles.css';

export default function Battles() {
  const { user } = useAuth();
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showChallenge, setShowChallenge] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/battles/my').then((r) => setBattles(r.data)).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await api.get('/battles/users/search', { params: { q: searchQ } });
      setSearchResults(data);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  const challenge = async (opponentId, name) => {
    try {
      await api.post(`/battles/challenge/${opponentId}`);
      notify.success(`Challenge sent to ${name}! ⚔️`);
      setShowChallenge(false);
      setSearchQ('');
      api.get('/battles/my').then((r) => setBattles(r.data));
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to challenge');
    }
  };

  const respond = async (id, action) => {
    try {
      const { data } = await api.put(`/battles/${id}/respond`, { action });
      setBattles((prev) => prev.map((b) => b.id === id ? { ...b, status: data.status } : b));
      notify.success(action === 'accept' ? '⚔️ Battle accepted!' : 'Battle declined');
    } catch { notify.error('Failed'); }
  };

  const statusColor = { pending: 'badge-blue', active: 'badge-red', completed: 'badge-green', declined: '' };
  const statusIcon = { pending: '⏳', active: '⚔️', completed: '🏆', declined: '❌' };

  if (!user) return (
    <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <h2 style={{ marginBottom: 8 }}>Login Required</h2>
      <p style={{ color: 'var(--text-muted)' }}>Sign in to enter battle arena</p>
    </div>
  );

  return (
    <div className="battles-page container">
      <div className="section-header">
        <h1 className="page-title">⚔️ Battle <span>Arena</span></h1>
        <button className="btn btn-primary" onClick={() => setShowChallenge(true)}>+ Challenge Someone</button>
      </div>

      <div className="battles-explainer">
        <div className="explain-card">
          <span>1️⃣</span>
          <p>Challenge a user to a watchlist battle</p>
        </div>
        <div className="explain-card">
          <span>2️⃣</span>
          <p>They accept — battle goes live for 3 days</p>
        </div>
        <div className="explain-card">
          <span>3️⃣</span>
          <p>Other users vote on who has the better watchlist</p>
        </div>
        <div className="explain-card">
          <span>4️⃣</span>
          <p>Winner earns points & climbs leaderboard</p>
        </div>
      </div>

      {loading ? <div className="spinner" /> : battles.length === 0 ? (
        <div className="empty-state">
          <div className="icon">⚔️</div>
          <h3>No battles yet</h3>
          <p>Challenge someone to prove your taste!</p>
        </div>
      ) : (
        <div className="battles-list">
          {battles.map((b) => {
            const isChallenger = b.challenger_id === user.id;
            const myName = isChallenger ? b.challenger_name : b.opponent_name;
            const theirName = isChallenger ? b.opponent_name : b.challenger_name;
            const myVotes = isChallenger ? b.challenger_votes : b.opponent_votes;
            const theirVotes = isChallenger ? b.opponent_votes : b.challenger_votes;
            const total = myVotes + theirVotes;
            const myPct = total ? Math.round((myVotes / total) * 100) : 50;

            const myId = isChallenger ? b.challenger_id : b.opponent_id;
            const theirId = isChallenger ? b.opponent_id : b.challenger_id;

            return (
              <div key={b.id} className="battle-card">
                <div className="battle-header">
                  <span className={`badge ${statusColor[b.status]}`}>
                    {statusIcon[b.status]} {b.status}
                  </span>
                  <span className="battle-date">
                    {b.ends_at ? `Ends ${new Date(b.ends_at).toLocaleDateString()}` : ''}
                  </span>
                </div>
                <div className="battle-vs">
                  <Link to={`/profile/${myId}`} className="battle-user" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="b-avatar">{myName?.[0]?.toUpperCase()}</div>
                    <span>{myName} <em>(You)</em></span>
                    <strong>{myVotes} votes</strong>
                  </Link>
                  <div className="vs-badge">VS</div>
                  <Link to={`/profile/${theirId}`} className="battle-user right" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="b-avatar">{theirName?.[0]?.toUpperCase()}</div>
                    <span>{theirName}</span>
                    <strong>{theirVotes} votes</strong>
                  </Link>
                </div>

                {b.status === 'active' && total > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${myPct}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      <span>{myPct}%</span><span>{100 - myPct}%</span>
                    </div>
                  </div>
                )}

                {b.status === 'pending' && !isChallenger && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => respond(b.id, 'accept')}>✅ Accept</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => respond(b.id, 'decline')}>❌ Decline</button>
                  </div>
                )}
                {b.status === 'pending' && isChallenger && (
                  <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>⏳ Waiting for {theirName} to respond...</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Challenge Modal */}
      {showChallenge && (
        <div className="modal-overlay" onClick={() => setShowChallenge(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 20 }}>⚔️ Challenge a User</h2>
            <input className="input" placeholder="Search by username..."
              value={searchQ} onChange={(e) => setSearchQ(e.target.value)} autoFocus />
            <div className="challenge-results">
              {searching && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 12 }}>Searching...</p>}
              {searchResults.map((u) => (
                <div key={u.id} className="challenge-user">
                  <Link to={`/profile/${u.id}`} className="b-avatar" style={{ textDecoration: 'none', color: 'inherit' }}>{u.username?.[0]?.toUpperCase()}</Link>
                  <div style={{ flex: 1 }}>
                    <Link to={`/profile/${u.id}`} style={{ textDecoration: 'none', color: 'inherit' }}><p style={{ fontWeight: 600 }}>{u.username}</p></Link>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.battle_wins}W · {u.total_points} pts</p>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => challenge(u.id, u.username)}>Challenge ⚔️</button>
                </div>
              ))}
              {searchQ && !searching && searchResults.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 12 }}>No users found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
