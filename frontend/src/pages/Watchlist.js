import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/movies/MovieCard';
import DetailsModal from '../components/movies/DetailsModal';
import api from '../utils/api';
import './Watchlist.css';

/**
 * ─── PERSONAL ARCHIVE (Watchlist) ───────────────────────────────
 * A curated collection of the user's cinematic journey. 
 * Allows for rating, reviewing, and watching trailers.
 */
export default function Watchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeMovie, setActiveMovie] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ user_rating: '', user_review: '', status: '' });

  const fetchWatchlist = () => {
    setLoading(true);
    api.get('/watchlist')
      .then((r) => setItems(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) fetchWatchlist();
  }, [user]);

  const remove = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Remove this title from your archive?')) return;
    try {
      await api.delete(`/watchlist/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Removed from archive');
    } catch { toast.error('Failed to remove'); }
  };

  const openEdit = (e, item) => {
    e.stopPropagation();
    setEditItem(item);
    setEditForm({ 
      user_rating: item.user_rating || '', 
      user_review: item.user_review || '', 
      status: item.status || 'watchlist' 
    });
  };

  const saveEdit = async () => {
    try {
      const { data } = await api.put(`/watchlist/${editItem.id}`, editForm);
      setItems((prev) => prev.map((i) => i.id === editItem.id ? data : i));
      setEditItem(null);
      toast.success('Archive updated');
    } catch { toast.error('Failed to update'); }
  };

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);
  
  const stats = {
    total: items.length,
    completed: items.filter((i) => i.status === 'completed').length,
    watchlist: items.filter((i) => i.status === 'watchlist').length,
    avgRating: items.filter((i) => i.user_rating).length
      ? (items.filter((i) => i.user_rating).reduce((s, i) => s + Number(i.user_rating), 0) / items.filter((i) => i.user_rating).length).toFixed(1)
      : '—',
  };

  if (!user) return (
    <div className="container" style={{ padding: '100px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>🔒</div>
      <h2 className="text-gradient" style={{ marginBottom: 12 }}>Archive Locked</h2>
      <p style={{ color: 'var(--text-muted)' }}>Sign in to access your personal cinematic archive.</p>
    </div>
  );

  return (
    <div className="watchlist-page container animate-fade">
      <header className="page-header" style={{ marginBottom: '48px' }}>
        <h1 className="page-title text-gradient">📋 My <span>Cinematic Archive</span></h1>
      </header>

      {/* Stats Dashboard */}
      <div className="wl-stats animate-up">
        <div className="wl-stat"><span>{stats.total}</span><label>Total Sagas</label></div>
        <div className="wl-stat"><span>{stats.completed}</span><label>Mastered</label></div>
        <div className="wl-stat"><span>{stats.watchlist}</span><label>Pending</label></div>
        <div className="wl-stat"><span>★ {stats.avgRating}</span><label>Heritage Score</label></div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs glass-card" style={{ maxWidth: 450, margin: '0 auto 40px', padding: '6px' }}>
        {['all', 'watchlist', 'completed'].map((f) => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All Records' : f === 'watchlist' ? '📋 Pending' : '✅ Mastered'}
          </button>
        ))}
      </div>

      {loading ? <div className="spinner" style={{ margin: '60px auto' }} /> : filtered.length === 0 ? (
        <div className="empty-state animate-fade">
          <div className="icon">🎬</div>
          <h3>The Archive is Empty</h3>
          <p>Begin your journey by searching and adding titles.</p>
        </div>
      ) : (
        <div className="movies-grid animate-up">
          {filtered.map((item) => (
            <div key={item.id} className="watchlist-item-wrapper" style={{ position: 'relative' }}>
               <MovieCard 
                  item={item} 
                  onClick={() => setActiveMovie(item)}
                  showStatus
               />
               <div className="watchlist-actions-overlay">
                  <button className="btn-edit" onClick={(e) => openEdit(e, item)}>✏️</button>
                  <button className="btn-delete" onClick={(e) => remove(e, item.id)}>🗑️</button>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {activeMovie && <DetailsModal item={activeMovie} onClose={() => setActiveMovie(null)} />}

      {/* Legacy Edit Modal */}
      {editItem && (
        <div className="modal-overlay animate-fade" onClick={() => setEditItem(null)}>
          <div className="modal-content glass-card animate-scale" style={{ maxWidth: '500px', padding: '40px' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-gradient" style={{ marginBottom: 24 }}>Refine Entry</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Updating records for: <strong>{editItem.title}</strong></p>
            
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 10, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Status</label>
              <div className="tabs glass-card" style={{ padding: '4px' }}>
                <button className={`tab ${editForm.status === 'watchlist' ? 'active' : ''}`} onClick={() => setEditForm({ ...editForm, status: 'watchlist' })}>Pending</button>
                <button className={`tab ${editForm.status === 'completed' ? 'active' : ''}`} onClick={() => setEditForm({ ...editForm, status: 'completed' })}>Mastered</button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 10, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Personal Score (1-10)</label>
              <input 
                className="input" 
                type="number" 
                min="1" max="10"
                value={editForm.user_rating}
                onChange={(e) => setEditForm({ ...editForm, user_rating: e.target.value })}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', width: '100%' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', marginBottom: 10, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cinematic Review</label>
              <textarea 
                className="input" 
                rows={3}
                value={editForm.user_review}
                onChange={(e) => setEditForm({ ...editForm, user_review: e.target.value })}
                placeholder="Share your thoughts on this masterpiece..."
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '8px', width: '100%', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-nav-primary" onClick={saveEdit} style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>Store Record</button>
              <button className="btn-nav-secondary" onClick={() => setEditItem(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
