import { useState, useEffect } from 'react';
import api from '../../utils/api';
import notify from '../../utils/notify';
import './PracticeVault.css';

export default function PracticeVault({ isOpen, onClose }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Creation State
  const [step, setStep] = useState(1); // 1: title, 2: images, 3: time
  const [newTitle, setNewTitle] = useState('');
  const [wikiImages, setWikiImages] = useState([]);
  const [selectedImg, setSelectedImg] = useState('');
  const [duration, setDuration] = useState(60); // minutes
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (isOpen && isUnlocked) {
      fetchTasks();
      const interval = setInterval(fetchTasks, 60000); // refresh every minute to check expiry
      return () => clearInterval(interval);
    }
  }, [isOpen, isUnlocked]);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/practice');
      setTasks(data);
      // Backend automatically handles cleanup via expires_at check? 
      // No, we'll manually check and delete from UI if expired or wait for backend cleanup route.
      // Let's call cleanup too
      await api.post('/practice/cleanup');
    } catch (err) { console.error("Vault fetch error"); }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === '1999') {
      setIsUnlocked(true);
      notify.success("Identity Verified. Accessing Vault...");
    } else {
      notify.error("Access Denied. Incorrect Passkey.");
      setPassword('');
    }
  };

  const searchImages = async () => {
    if (!newTitle.trim()) return;
    setIsSearching(true);
    setStep(2);
    try {
      const { data } = await api.get(`/wiki/search?query=${encodeURIComponent(newTitle)}`);
      // Extract thumbnails
      const images = (data.results || []).map(r => r.thumbnail).filter(t => t);
      setWikiImages(images.slice(0, 6));
      if (images.length > 0) setSelectedImg(images[0]);
    } catch (err) {
      console.error("Wiki search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const addTask = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/practice', {
        title: newTitle,
        thumbnail_url: selectedImg,
        duration_minutes: duration
      });
      setTasks([data, ...tasks]);
      resetForm();
      notify.success("Archive Entry Stored. Countdown Initiated.");
    } catch (err) {
      notify.error("Storage Error.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setNewTitle('');
    setWikiImages([]);
    setSelectedImg('');
    setDuration(60);
  };

  const deleteRecord = async (id) => {
    try {
      await api.delete(`/practice/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
      notify.info("Archive Purged.");
    } catch (err) { notify.error("Purge Failed."); }
  };

  if (!isOpen) return null;

  return (
    <div className="vault-overlay animate-fade" onClick={onClose}>
      <div className="vault-content glass-card animate-scale" onClick={e => e.stopPropagation()}>
        <button className="vault-close" onClick={onClose}>&times;</button>

        {!isUnlocked ? (
          <div className="unlock-screen">
            <div className="vault-icon pulse">🔒</div>
            <h2 className="text-gradient">Classified Archive</h2>
            <p className="vault-sub">Permission protocol required for decryption.</p>
            <form onSubmit={handleUnlock}>
               <input 
                type="password" 
                placeholder="ENTER PASSKEY" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className="vault-pass-input"
               />
               <button type="submit" className="vault-btn btn-primary">VERIFY</button>
            </form>
          </div>
        ) : (
          <div className="vault-dashboard">
            <div className="vault-header">
               <h2 className="text-gradient">Personal Training Vault</h2>
               <div className="vault-status">DECRYPTED</div>
            </div>

            <div className="vault-layout">
               {/* Left: Task List */}
               <div className="vault-list-container custom-scrollbar">
                  {tasks.length === 0 ? (
                    <div className="vault-empty">
                      <p>Archive Empty. No training records found.</p>
                    </div>
                  ) : (
                    <div className="vault-grid">
                      {tasks.map(task => {
                        const timeLeft = Math.max(0, Math.ceil((new Date(task.expires_at) - new Date()) / 60000));
                        return (
                          <div key={task.id} className="vault-task-card glass-card animate-up">
                            <div className="task-thumb-wrap">
                               <img src={task.thumbnail_url || 'https://via.placeholder.com/200?text=RECORD'} alt={task.title} />
                               <div className="task-timer-badge">{timeLeft}m</div>
                            </div>
                            <div className="task-info">
                               <h4>{task.title}</h4>
                               <button className="purge-mini" onClick={() => deleteRecord(task.id)}>Purge</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
               </div>

               {/* Right: Add New */}
               <div className="vault-creation-panel glass-card">
                  <h3 className="panel-title">Initiate Protocol</h3>
                  
                  {step === 1 && (
                    <div className="creation-step animate-fade">
                       <label>Mission Objective</label>
                       <input 
                        type="text" 
                        placeholder="e.g. Traveling Code, Deep Focus..." 
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                       />
                       <button className="vault-btn" onClick={searchImages} disabled={!newTitle.trim()}>
                          SEARCH WIKI BASE →
                       </button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="creation-step animate-fade">
                       <label>Visual Identity Selection</label>
                       {isSearching ? (
                        <div className="vault-spinner" />
                       ) : (
                        <div className="wiki-img-grid">
                           {wikiImages.map((src, i) => (
                             <img 
                              key={i} 
                              src={src} 
                              className={selectedImg === src ? 'active' : ''} 
                              onClick={() => setSelectedImg(src)}
                              alt="wiki-thumb"
                             />
                           ))}
                        </div>
                       )}
                       <button className="vault-btn" onClick={() => setStep(3)}>
                          SET DURATION →
                       </button>
                       <button className="btn-back" onClick={() => setStep(1)}>Back</button>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="creation-step animate-fade">
                       <label>Protocol Window (Minutes)</label>
                       <input 
                        type="range" min="1" max="480" step="5"
                        value={duration}
                        onChange={e => setDuration(parseInt(e.target.value))}
                       />
                       <div className="duration-display">{Math.floor(duration/60)}h {duration%60}m</div>
                       <button className="vault-btn btn-primary" onClick={addTask} disabled={loading}>
                          {loading ? 'STORING...' : 'FINALIZE ENTRY ✨'}
                       </button>
                       <button className="btn-back" onClick={() => setStep(2)}>Back</button>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
