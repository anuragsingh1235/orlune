import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import notify from '../utils/notify';
import { useAuth } from '../context/AuthContext';
import MovieCard from '../components/movies/MovieCard';
import DetailsModal from '../components/movies/DetailsModal';
import MasteryQuestionModal from '../components/movies/MasteryQuestionModal';
import CommunityRatings from '../components/movies/CommunityRatings';
import Footer from '../components/layout/Footer';
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
  const [filter, setFilter] = useState('collection');
  const [view, setView] = useState('personal'); // 'personal' or 'community'
  const [activeMovie, setActiveMovie] = useState(null);
  const [masteringItem, setMasteringItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ heritage_score: '', user_review: '', status: '' });
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [budget, setBudget] = useState(180);
  const [optimResult, setOptimResult] = useState(null);

  // ... (keep fetch and handlers)
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
      notify.success('Record purged from archive');
    } catch (err) { 
      const msg = err.response?.data?.error || 'Failed to remove';
      notify.error(msg, { duration: 4000 }); 
    }
  };

  const masterRecord = async (editData) => {
    try {
      const { data } = await api.put(`/watchlist/${masteringItem.id}`, editData);
      setItems((prev) => prev.map((i) => i.id === masteringItem.id ? data : i));
      setMasteringItem(null);
      notify.success('Masterpiece Record Stored 🏛️');
    } catch (err) { 
      const msg = err.response?.data?.error || 'Failed to update record';
      notify.error(msg); 
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
      notify.success('Archive updated');
    } catch { notify.error('Failed to update'); }
  };

  const safeItems = Array.isArray(items) ? items : [];
  const filtered = filter === 'all' 
    ? safeItems 
    : safeItems.filter((i) => i.status?.toLowerCase() === filter.toLowerCase());
  
  const stats = {
    total: safeItems.length,
    completed: safeItems.filter((i) => i.status?.toLowerCase() === 'completed').length,
    watchlist: safeItems.filter((i) => i.status?.toLowerCase() === 'watchlist').length,
    avgRating: (() => {
      const rated = safeItems.filter((i) => i.heritage_score != null && i.heritage_score !== '');
      if (!rated.length) return '—';
      const sum = rated.reduce((s, i) => s + Number(i.heritage_score), 0);
      return (sum / rated.length).toFixed(1);
    })(),
  };

  const runBingeOptimizer = async () => {
    setOptimizing(true);
    try {
      // Pull items currently in "Watchlist" (Pending)
      const pendingItems = safeItems.filter(i => i.status === 'watchlist' || i.status === 'collection');
      
      if (pendingItems.length === 0) {
        notify.error("No pending movies in your archive to optimize!");
        setOptimizing(false);
        return;
      }

      const formattedItems = pendingItems.map((m, idx) => ({
        id: m.id,
        title: m.title || `Movie ${idx}`,
        // Use TMDB runtime if saved, or fallback estimating 120 mins
        weight: m.runtime || Math.floor(Math.random() * 60) + 90, 
        // Use rating or default to 5.0 for value
        value: Number(m.heritage_score) || 7.0 + Math.random() * 2 
      }));

      const res = await api.post('/lab/knapsack', { items: formattedItems, capacity: budget });
      setOptimResult(res.data.dp01); // 0/1 Knapsack optimal result
    } catch (e) {
      notify.error("Failed to run DAA Algorithm core.");
    }
    setOptimizing(false);
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
      <Footer />
    </div>
  );

  return (
    <div className="watchlist-page container animate-fade">
      <header className="page-header" style={{ marginBottom: '48px', position: 'relative' }}>
        <h1 className="page-title text-gradient">📋 The <span>Cinematic Vault</span></h1>
        <div className="header-lottie hide-mobile">
           <img src="/logo.png" alt="Orlune Logo" style={{ width: '60px', height: '60px', filter: 'drop-shadow(0 0 10px rgba(180, 142, 173, 0.4))' }} />
        </div>
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
          <div className="filter-tabs glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['collection', 'watching', 'completed'].map((f) => (
              <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'collection' ? '📦 Vault' : f === 'watching' ? '⏳ Watching' : '✨ Mastered Archive'}
              </button>
            ))}
            
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', height: '24px', margin: 'auto 8px' }} />
            
            <button 
              className={`filter-tab ${showOptimizer ? 'active' : ''}`} 
              onClick={() => setShowOptimizer(!showOptimizer)}
              style={{ color: '#88C0D0', borderColor: showOptimizer ? '#88C0D0' : 'transparent', background: showOptimizer ? 'rgba(136,192,208,0.1)' : 'transparent' }}
            >
              ♟️ Binge Optimizer
            </button>
          </div>
        )}
      </div>

      {/* OPTIMIZER PANEL */}
      {view === 'personal' && showOptimizer && (
        <div className="optimizer-panel glass-card animate-fade" style={{ marginBottom: 30, padding: 24, border: '1px solid rgba(136,192,208,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <h3 style={{ color: '#88C0D0', display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', marginBottom: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Orlune Binge Optimizer
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Powered by the <strong style={{color:'#fff'}}>0/1 Knapsack Dynamic Programming Algorithm</strong>. 
                Have a limited amount of time to watch movies? Set your time budget and the algorithm will mathematically select the perfect combination of movies from your pending Vault to maximize total quality rating.
              </p>
              
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Time Budget: <span style={{color:'#88C0D0'}}>{Math.floor(budget/60)}h {budget%60}m</span></label>
                <input 
                  type="range" min="60" max="600" step="10" 
                  value={budget} onChange={e => setBudget(+e.target.value)} 
                  style={{ flex: 1, accentColor: '#88C0D0', cursor: 'pointer' }}
                />
                <button 
                  onClick={runBingeOptimizer} 
                  disabled={optimizing}
                  style={{ padding: '8px 16px', background: '#88C0D0', color: '#111', fontWeight: 800, borderRadius: 8, border: 'none', cursor: 'pointer' }}
                >
                  {optimizing ? 'Calculating...' : 'Run DP Algorithm'}
                </button>
              </div>
            </div>

            {optimResult && (
              <div style={{ flex: 1, minWidth: 300, background: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Optimal Selection Found:</span>
                  <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#A3BE8C' }}>{optimResult.totalWeight} / {budget} min</div>
                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Maximum Utility: {optimResult.maxValue.toFixed(1)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {optimResult.selected?.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 6, fontSize: '0.85rem' }}>
                      <strong style={{ color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>✅ {m.title}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>{m.weight}m • ⭐ {m.value.toFixed(1)}</span>
                    </div>
                  ))}
                  {optimResult.selected?.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 12 }}>Not enough time for any pending movies.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'community' ? (
        <CommunityRatings />
      ) : loading ? <div className="spinner" style={{ margin: '60px auto' }} /> : filtered.length === 0 ? (
        <div className="empty-state animate-fade" style={{ padding: '40px 0' }}>
          <div className="empty-lottie">
            <lottie-player 
              src="https://assets5.lottiefiles.com/packages/lf20_t9gkkhz4.json"
              background="transparent" speed="1" 
              style={{ width: '280px', height: '280px', margin: '0 auto' }} 
              loop autoplay>
            </lottie-player>
          </div>
          <h3 style={{ marginTop: '20px', fontFamily: 'Outfit', fontSize: '1.5rem' }}>The Archive is Empty</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Begin your journey by searching and adding titles to your legacy.</p>
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
                  {item.status === 'collection' && (
                    <button className="btn-action btn-start-journey" onClick={async (e) => { 
                      e.stopPropagation(); 
                      try {
                        const { data } = await api.put(`/watchlist/${item.id}`, { status: 'watching' });
                        setItems((prev) => prev.map((i) => i.id === item.id ? data : i));
                        notify.success('Cinematic Journey Started 🎬');
                      } catch { notify.error('Failed to start journey'); }
                    }} title="Start Journey">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 6V18L17 12L7 6Z" fill="currentColor" />
                       </svg>
                    </button>
                  )}
                  {item.status === 'watching' && (
                    <button className="btn-action btn-master-award" onClick={(e) => { e.stopPropagation(); setMasteringItem(item); }} title="Master this record">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" />
                       </svg>
                    </button>
                  )}
                   {/* Only show edit for Watching or Completed states */}
                   {item.status !== 'collection' && (
                    <button className="btn-action btn-edit-record" onClick={(e) => openEdit(e, item)} title="Edit record">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 17.25V21H6.75L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04V7.04Z" fill="currentColor" />
                       </svg>
                    </button>
                   )}
                  <button className="btn-action btn-purge-record" onClick={(e) => remove(e, item.id)} title="Purge Record">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z" fill="currentColor" />
                     </svg>
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILS MODAL */}
      {activeMovie && <DetailsModal item={activeMovie} onClose={() => setActiveMovie(null)} hideTrailer={false} />}

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
                step="0.1"
                min="1" max="10"
                value={editForm.heritage_score}
                onChange={(e) => setEditForm({ ...editForm, heritage_score: e.target.value })}
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

      <Footer />
    </div>
  );
}
