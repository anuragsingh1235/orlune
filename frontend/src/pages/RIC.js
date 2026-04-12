import React, { useState, useEffect, useRef } from 'react';
import './RIC.css';
import api from '../utils/api';

const ReelCard = ({ url, caption, username, isActive }) => {
  const videoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isActive) {
      videoRef.current?.play().catch(() => {});
    } else {
      videoRef.current?.pause();
    }
  }, [isActive]);

  return (
    <div className="ric-reel-container">
      {!loaded && <div className="ric-skeleton" />}
      <video
        ref={videoRef}
        src={url}
        className="ric-video"
        loop
        playsInline
        onLoadedData={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
      <div className="ric-overlay">
        <div className="ric-info">
          <div className="ric-curated-badge">Universal Archive</div>
          <div className="ric-user">
            <div className="ric-avatar">{username?.[0] || 'R'}</div>
            <span>{username || 'Orlune.RIC'}</span>
          </div>
          <p className="ric-caption">{caption || 'Deep link extracted from Instagram.'}</p>
        </div>
        <div className="ric-actions">
          <div className="ric-action">❤️ <span>Liked</span></div>
          <div className="ric-action">💬 <span>0</span></div>
          <div className="ric-action">✈️ <span>Share</span></div>
        </div>
      </div>
    </div>
  );
};

export default function RIC() {
  const [activeTab, setActiveTab] = useState('visualizer'); // 'visualizer' | 'archive'
  const [url, setUrl] = useState('');
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      const { data } = await api.get('/ric');
      setReels(data);
    } catch {}
  };

  const extractReel = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const { data: extraction } = await api.get(`/download/info?url=${encodeURIComponent(url)}`);
      if (extraction.url) {
        const { data: savedReel } = await api.post('/ric', { 
           url: extraction.url, 
           caption: extraction.filename || 'Archive Entry', 
           username: 'RIC_NODE' 
        });
        setReels(prev => [savedReel, ...prev]);
        setUrl('');
      } else {
        alert("Extraction Failed");
      }
    } catch (err) {
      alert("System Error");
    }
    setLoading(false);
  };

  const removeReel = async (id) => {
    if (!window.confirm("Remove this entry from the global archive?")) return;
    try {
      await api.delete(`/ric/${id}`);
      setReels(reels.filter(r => r.id !== id));
    } catch {
      alert("Delete failed");
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scroll = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const newIndex = Math.round(scroll / height);
    if (newIndex !== currentIndex) setCurrentIndex(newIndex);
  };

  return (
    <div className="ric-root">
      {/* ── Sub Navigation ── */}
      <div className="ric-nav">
        <button className={activeTab === 'visualizer' ? 'active' : ''} onClick={() => setActiveTab('visualizer')}>VISUALIZER</button>
        <button className={activeTab === 'archive' ? 'active' : ''} onClick={() => setActiveTab('archive')}>ARCHIVE</button>
      </div>

      <div className="ric-main-content">
        {activeTab === 'visualizer' ? (
          <div className="ric-visualizer-view">
            {reels.length === 0 ? (
              <div className="ric-empty">
                <div className="ric-empty-icon">⚛️</div>
                <h2>RIC Visualizer Empty</h2>
                <p>No streams loaded in the collective archive.</p>
              </div>
            ) : (
              <div className="ric-reels-container" ref={containerRef} onScroll={handleScroll}>
                {reels.map((reel, index) => (
                  <ReelCard 
                    key={reel.id} 
                    url={reel.url} 
                    caption={reel.caption}
                    username={reel.username}
                    isActive={index === currentIndex} 
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="ric-archive-view fade-in">
            <div className="ric-archive-header">
              <h3>Collective Archive Management</h3>
              <div className="ric-archive-input">
                <input 
                  type="text" 
                  placeholder="Insert secure stream link..." 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button onClick={extractReel} disabled={loading}>{loading ? 'SYNCING...' : 'SYNC LINK'}</button>
              </div>
            </div>

            <div className="ric-archive-list-wrap custom-scrollbar">
              <div className="ric-archive-list">
                {reels.map(r => (
                  <div key={r.id} className="ric-archive-item">
                    <div className="ric-item-preview">
                      <video src={r.url} muted />
                    </div>
                    <div className="ric-item-info">
                       <span className="ric-item-title">{r.caption}</span>
                       <span className="ric-item-date">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <button className="ric-item-remove" onClick={() => removeReel(r.id)}>REMOVE</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
