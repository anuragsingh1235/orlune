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
  const [deadline, setDeadline] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Recovery State
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: email/request, 2: verify/reset
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    if (isOpen && isUnlocked) {
      fetchTasks();
      const interval = setInterval(fetchTasks, 30000); // refresh check
      return () => clearInterval(interval);
    }
  }, [isOpen, isUnlocked]);

  const fetchTasks = async () => {
    try {
      const { data } = await api.get('/practice');
      // Filter out those that are already expired in local view
      const active = data.filter(t => new Date(t.expires_at) > new Date());
      setTasks(active);
      await api.post('/practice/cleanup');
    } catch (err) { console.error("Vault fetch error"); }
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/vault/verify', { pin: password });
      setIsUnlocked(true);
      notify.success("Identity Verified. Accessing Vault...");
    } catch (err) {
      notify.error(err.response?.data?.error || "Access Denied. Incorrect Passkey.");
      setPassword('');
    }
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    try {
      await api.post('/auth/vault/forgot');
      setRecoveryStep(2);
      notify.success("Security OTP sent to your email.");
    } catch (err) {
      notify.error(err.response?.data?.error || "Failed to initiate recovery.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (newPin.length !== 4) return notify.error("PIN must be 4 digits");
    setLoading(true);
    try {
      await api.post('/auth/vault/reset', { otp, newPin });
      notify.success("Passkey Reset Successful. Login with your new PIN.");
      setShowRecovery(false);
      setRecoveryStep(1);
      setOtp('');
      setNewPin('');
    } catch (err) {
      notify.error(err.response?.data?.error || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const searchImages = async () => {
    if (!newTitle.trim()) return;
    setIsSearching(true);
    setWikiImages([]);
    try {
      const { data } = await api.get(`/wiki/search?query=${encodeURIComponent(newTitle)}`);
      // Extract thumbnails and titles
      const images = (data.results || []).map(r => r.thumbnail).filter(t => t);
      setWikiImages(images.slice(0, 8));
      if (images.length > 0) setSelectedImg(images[0]);
      setStep(2);
    } catch (err) {
      notify.error("Intelligence failure. Wiki base unreachable.");
    } finally {
      setIsSearching(false);
    }
  };

  const addTask = async () => {
    if (!deadline) return notify.error("Set a target deadline.");
    setLoading(true);
    try {
      const { data } = await api.post('/practice', {
        title: newTitle,
        thumbnail_url: selectedImg,
        expires_at: deadline
      });
      setTasks([data, ...tasks]);
      resetForm();
      notify.success("Objective Saved. Monitoring Active.");
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
    setDeadline('');
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("Purge this objective from the archive?")) return;
    try {
      await api.delete(`/practice/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
      notify.info("Objective Purged.");
    } catch (err) { notify.error("Purge Failed."); }
  };

  const getCountdown = (date) => {
    const diff = new Date(date) - new Date();
    if (diff <= 0) return "EXPIRED";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="vault-overlay animate-fade" onClick={onClose}>
      <div className="vault-content glass-card animate-scale" onClick={e => e.stopPropagation()}>
        <div className="vault-top-bar">
           <div className="vault-brand">ORLUNE<span>VAULT</span></div>
           <button className="vault-close" onClick={onClose}>&times;</button>
        </div>

        {!isUnlocked ? (
          <div className="unlock-screen">
             {!showRecovery ? (
               <>
                <div className="vault-icon-svg pulse">
                   <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <h2 className="text-gradient">Classified Archive</h2>
                <p className="vault-sub">Enter clearance level (Passkey) to decrypt private records.</p>
                <form onSubmit={handleUnlock}>
                   <input 
                    type="password" 
                    placeholder="____" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                    className="vault-pass-input"
                   />
                   <button type="submit" className="vault-btn btn-primary">DECRYPT BASE</button>
                </form>
                <button className="vault-forgot-link" onClick={() => setShowRecovery(true)}>Forgot Passkey?</button>
               </>
             ) : (
               <div className="recovery-flow animate-fade">
                  <h3 className="text-gradient">Access Recovery</h3>
                  {recoveryStep === 1 ? (
                    <>
                      <p className="vault-sub">A security code will be sent to your registered email.</p>
                      <button className="vault-btn btn-primary" onClick={handleRequestOTP} disabled={loading}>
                        {loading ? 'SENDING...' : 'SEND OTP'}
                      </button>
                      <button className="btn-back" onClick={() => setShowRecovery(false)}>CANCEL</button>
                    </>
                  ) : (
                    <div className="otp-reset-form">
                       <input 
                        type="text" 
                        placeholder="ENTER OTP" 
                        value={otp} 
                        onChange={e => setOtp(e.target.value)}
                        className="vault-pass-input"
                        style={{ fontSize: '1.2rem', letterSpacing: '8px' }}
                       />
                       <input 
                        type="password" 
                        placeholder="NEW 4-DIGIT PIN" 
                        maxLength="4"
                        value={newPin} 
                        onChange={e => setNewPin(e.target.value)}
                        className="vault-pass-input"
                        style={{ fontSize: '1.2rem', letterSpacing: '8px' }}
                       />
                       <button className="vault-btn btn-primary" onClick={handleResetPin} disabled={loading}>
                         {loading ? 'RESETTING...' : 'UPDATE PIN'}
                       </button>
                    </div>
                  )}
               </div>
             )}
          </div>
        ) : (
          <div className="vault-dashboard">
            <div className="vault-header">
               <div className="vh-left">
                  <h2 className="text-gradient">Training Objectives</h2>
                  <p>Monitoring active ({tasks.length} live records)</p>
               </div>
               <div className="vault-status-chip">STATUS: SECURE</div>
            </div>

            <div className="vault-layout">
               <div className="vault-view custom-scrollbar">
                  {tasks.length === 0 ? (
                    <div className="vault-empty">
                      <h3>Archive Empty</h3>
                      <p>No active training protocols detected. Use the panel to initiate.</p>
                    </div>
                  ) : (
                    <div className="vault-movie-grid">
                      {tasks.map(task => (
                        <div key={task.id} className="vault-movie-card animate-up">
                          <div className="vmc-poster">
                             <img src={task.thumbnail_url || 'https://via.placeholder.com/200?text=RECORD'} alt={task.title} />
                             <div className="vmc-timer">
                                <span>{getCountdown(task.expires_at)} left</span>
                             </div>
                             <button className="vmc-purge" onClick={() => deleteRecord(task.id)} title="Purge Record">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                             </button>
                          </div>
                          <div className="vmc-info">
                             <h4>{task.title}</h4>
                             <div className="vmc-meta">Target: {new Date(task.expires_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>

               <div className="vault-creation-panel glass-card">
                  <div className="cp-header">
                     <h3>New Protocol</h3>
                     <div className="step-dots">
                        <span className={step >= 1 ? 'active' : ''} />
                        <span className={step >= 2 ? 'active' : ''} />
                        <span className={step >= 3 ? 'active' : ''} />
                     </div>
                  </div>
                  
                  {step === 1 && (
                    <div className="creation-step animate-fade">
                       <label>Mission Objective</label>
                       <div className="input-group">
                          <input 
                            type="text" 
                            placeholder="e.g. Swimming Master, DAA Prep..." 
                            value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && searchImages()}
                          />
                       </div>
                       <button className="vault-btn btn-primary" onClick={searchImages} disabled={!newTitle.trim() || isSearching}>
                          {isSearching ? 'SEARCHING WIKI...' : 'FIND VISUALS →'}
                       </button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="creation-step animate-fade">
                       <label>Visual Identity (from Wikipedia)</label>
                       <div className="wiki-img-grid custom-scrollbar">
                          {wikiImages.map((src, i) => (
                            <div 
                              key={i} 
                              className={`wiki-thumb-card animate-fade ${selectedImg === src ? 'active' : ''}`}
                              style={{ animationDelay: `${i * 0.08}s` }}
                              onClick={() => setSelectedImg(src)}
                            >
                               <img src={src} alt="wiki" />
                               {selectedImg === src && <div className="sel-check"></div>}
                            </div>
                          ))}
                          {wikiImages.length === 0 && <p className="wiki-none">No visual identity found. Go back and try a broader term.</p>}
                       </div>
                       <button className="vault-btn btn-primary" onClick={() => setStep(3)} disabled={!selectedImg}>
                          SET TARGET DATE →
                       </button>
                       <button className="btn-back" onClick={() => setStep(1)}>← BACK</button>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="creation-step animate-fade">
                       <label>Protocol Deadline (Calendar)</label>
                       <div className="date-input-wrap">
                          <input 
                            type="datetime-local" 
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                            className="vault-date-picker"
                          />
                       </div>
                       <div className="deadline-preview">
                          {deadline ? `Target: ${new Date(deadline).toLocaleString()}` : "Pick a date & time"}
                       </div>
                       <button className="vault-btn btn-primary" onClick={addTask} disabled={loading || !deadline}>
                          {loading ? 'STORING...' : 'INITIATE COUTDOWN ✨'}
                       </button>
                       <button className="btn-back" onClick={() => setStep(2)}>← BACK</button>
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
