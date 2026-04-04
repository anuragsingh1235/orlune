import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/movies/MovieCard';
import DetailsModal from '../components/movies/DetailsModal';
import MasteryQuestionModal from '../components/movies/MasteryQuestionModal';
import CommunityRatings from '../components/movies/CommunityRatings';
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
  const [view, setView] = useState('personal'); // 'personal' or 'community'
  const [activeMovie, setActiveMovie] = useState(null);
  const [masteringItem, setMasteringItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ heritage_score: '', user_review: '', status: '' });

  const fetchWatchlist = () => {
    setLoading(true);
    api.get('/watchlist')
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(err => {
        console.error(err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      fetchWatchlist();
    } else {
      setLoading(false);
    }
  }, [user]);

  const remove = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Remove this record from your archive?')) return;
    try {
      await api.delete(`/watchlist/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Record purged from archive');
    } catch (err) { 
      const msg = err.response?.data?.error || 'Failed to remove';
      toast.error(msg, { duration: 4000 }); 
    }
  };

  const masterRecord = async (editData) => {
    try {
      const { data } = await api.put(`/watchlist/${masteringItem.id}`, editData);
      setItems((prev) => prev.map((i) => i.id === masteringItem.id ? data : i));
      setMasteringItem(null);
      toast.success('Masterpiece Record Stored 🏛️');
    } catch (err) { 
      const msg = err.response?.data?.error || 'Failed to update record';
      toast.error(msg); 
    }
  };

  const openEdit = (e, item) => {
    e.stopPropagation();
    setEditItem(item);
    setEditForm({ 
      heritage_score: item.heritage_score || '', 
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

  const safeItems = Array.isArray(items) ? items : [];
  const filtered = filter === 'all' ? safeItems : safeItems.filter((i) => i.status === filter);
  
  const stats = {
    total: safeItems.length,
    completed: safeItems.filter((i) => i.status === 'completed').length,
    watchlist: safeItems.filter((i) => i.status === 'watchlist').length,
    avgRating: (() => {
      const rated = safeItems.filter((i) => i.heritage_score != null && i.heritage_score !== '');
      if (!rated.length) return '—';
      const sum = rated.reduce((s, i) => s + Number(i.heritage_score), 0);
      return (sum / rated.length).toFixed(1);
    })(),
  };

  if (!user) return (
    <div className="watchlist-page container animate-fade">
      <header className="page-header" style={{ marginBottom: '48px' }}>
        <h1 className="page-title text-gradient">📋 My <span>Cinematic Archive</span></h1>
      </header>

      <div style={{ position: 'relative' }}>
        <div className="wl-stats animate-up" style={{ filter: 'blur(4px) grayscale(30%)', opacity: 0.5, pointerEvents: 'none' }}>
          <div className="wl-stat"><span>142</span><label>Total Sagas</label></div>
          <div className="wl-stat"><span>89</span><label>Mastered</label></div>
          <div className="wl-stat"><span>53</span><label>Pending</label></div>
          <div className="wl-stat"><span>★ 8.4</span><label>Heritage Score</label></div>
        </div>

        <div className="content-gate" style={{ marginTop: '-150px' }}>
          <div className="gate-blur" style={{ height: '300px' }} />
          <div className="gate-inner">
            <h2 className="gate-title" style={{ fontSize: '2rem', marginBottom: '8px' }}>Archive Locked</h2>
            <p className="gate-sub">Sign in to access and manage your personal cinematic archive.</p>
            <Link to="/login" className="btn-join">Sign In to View</Link>
          </div>
        </div>
      </div>
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

      {/* Navigation Tabs */}
      <div className="tabs-container animate-up">
        <div className="view-selector glass-card">
          <button className={`view-btn ${view === 'personal' ? 'active' : ''}`} onClick={() => setView('personal')}>📜 My Archive</button>
          <button className={`view-btn ${view === 'community' ? 'active' : ''}`} onClick={() => setView('community')}>🏛️ Global Heritage</button>
        </div>

        {view === 'personal' && (
          <div className="filter-tabs glass-card">
            {['all', 'watchlist', 'completed'].map((f) => (
              <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All Records' : f === 'watchlist' ? '📋 Pending' : '✅ Mastered'}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'community' ? (
        <CommunityRatings />
      ) : loading ? <div className="spinner" style={{ margin: '60px auto' }} /> : filtered.length === 0 ? (
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
                  {item.status !== 'completed' && (
                    <button className="btn-master" onClick={(e) => { e.stopPropagation(); setMasteringItem(item); }} title="Master this record">✅</button>
                  )}
                  <button className="btn-edit" onClick={(e) => openEdit(e, item)} title="Edit record">✏️</button>
                  <button className="btn-delete" onClick={(e) => remove(e, item.id)} title="Purge Record">🗑️</button>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {activeMovie && <DetailsModal item={activeMovie} onClose={() => setActiveMovie(null)} />}

      {/* Mastery Question Modal */}
      {masteringItem && (
        <MasteryQuestionModal 
          item={masteringItem} 
          onComplete={masterRecord} 
          onClose={() => setMasteringItem(null)} 
        />
      )}

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
