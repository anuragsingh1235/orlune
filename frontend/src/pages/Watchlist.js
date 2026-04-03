import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Watchlist.css';

const IMG = 'https://image.tmdb.org/t/p/w185';

export default function Watchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ user_rating: '', user_review: '', status: '' });

  useEffect(() => {
    api.get('/watchlist').then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, []);

  const remove = async (id) => {
    if (!window.confirm('Remove from watchlist?')) return;
    try {
      await api.delete(`/watchlist/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Removed');
    } catch { toast.error('Failed'); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({ user_rating: item.user_rating || '', user_review: item.user_review || '', status: item.status || 'watchlist' });
  };

  const saveEdit = async () => {
    try {
      const { data } = await api.put(`/watchlist/${editItem.id}`, editForm);
      setItems((prev) => prev.map((i) => i.id === editItem.id ? data : i));
      setEditItem(null);
      toast.success('Updated!');
    } catch { toast.error('Failed'); }
  };

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);
  const stats = {
    total: items.length,
    completed: items.filter((i) => i.status === 'completed').length,
    watchlist: items.filter((i) => i.status === 'watchlist').length,
    avgRating: items.filter((i) => i.user_rating).length
      ? (items.filter((i) => i.user_rating).reduce((s, i) => s + i.user_rating, 0) / items.filter((i) => i.user_rating).length).toFixed(1)
      : '—',
  };

  if (!user) return (
    <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <h2 style={{ marginBottom: 8 }}>Login Required</h2>
      <p style={{ color: 'var(--text-muted)' }}>Sign in to manage your watchlist</p>
    </div>
  );

  return (
    <div className="watchlist-page container">
      <h1 className="page-title">📋 My <span>Watchlist</span></h1>

      {/* Stats */}
      <div className="wl-stats">
        <div className="wl-stat"><span>{stats.total}</span><label>Total</label></div>
        <div className="wl-stat"><span>{stats.completed}</span><label>Watched</label></div>
        <div className="wl-stat"><span>{stats.watchlist}</span><label>To Watch</label></div>
        <div className="wl-stat"><span>⭐ {stats.avgRating}</span><label>Avg Rating</label></div>
      </div>

      {/* Filter */}
      <div className="tabs" style={{ maxWidth: 360, marginBottom: 28 }}>
        {['all', 'watchlist', 'completed'].map((f) => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'watchlist' ? '📋 To Watch' : '✅ Watched'}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" /> : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎬</div>
          <h3>Nothing here yet</h3>
          <p>Search for movies and add them to your watchlist</p>
        </div>
      ) : (
        <div className="wl-list">
          {filtered.map((item) => (
            <div key={item.id} className="wl-item">
              <img
                src={item.poster_path
                  ? (item.poster_path.startsWith('http') ? item.poster_path : `${IMG}${item.poster_path}`)
                  : `https://via.placeholder.com/185x278/1a1a26/fff?text=${encodeURIComponent(item.title)}`}
                alt={item.title} className="wl-poster"
              />
              <div className="wl-details">
                <div className="wl-header">
                  <h3 className="wl-title">{item.title}</h3>
                  <span className={`badge ${item.status === 'completed' ? 'badge-green' : 'badge-blue'}`}>
                    {item.status === 'completed' ? '✅ Watched' : '📋 To Watch'}
                  </span>
                </div>
                <p className="wl-meta">{(item.release_date || '').slice(0, 4)} · {item.media_type?.toUpperCase()}</p>
                {item.user_rating && <p className="wl-rating">{'★'.repeat(Math.round(item.user_rating / 2))} {item.user_rating}/10</p>}
                {item.user_review && <p className="wl-review">"{item.user_review}"</p>}
                <p className="wl-overview">{item.overview?.slice(0, 120)}...</p>
              </div>
              <div className="wl-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>✏️ Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(item.id)} style={{ color: 'var(--accent)' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 20 }}>✏️ Edit — {editItem.title}</h2>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Status</label>
              <div className="tabs">
                <button className={`tab ${editForm.status === 'watchlist' ? 'active' : ''}`} onClick={() => setEditForm({ ...editForm, status: 'watchlist' })}>To Watch</button>
                <button className={`tab ${editForm.status === 'completed' ? 'active' : ''}`} onClick={() => setEditForm({ ...editForm, status: 'completed' })}>Watched</button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Rating (1–10)</label>
              <input className="input" type="number" min="1" max="10"
                value={editForm.user_rating}
                onChange={(e) => setEditForm({ ...editForm, user_rating: e.target.value })}
                placeholder="Your rating out of 10" />
            </div>
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Review</label>
              <textarea className="input" rows={3}
                value={editForm.user_review}
                onChange={(e) => setEditForm({ ...editForm, user_review: e.target.value })}
                placeholder="What did you think?" style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={saveEdit} style={{ flex: 1, justifyContent: 'center' }}>Save</button>
              <button className="btn btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
