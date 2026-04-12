import React, { useState, useEffect, useRef } from 'react';
import './RIC.css';
import api from '../utils/api';

const ReelCard = ({ url, isActive }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      videoRef.current?.play().catch(() => {});
    } else {
      videoRef.current?.pause();
    }
  }, [isActive]);

  return (
    <div className="ric-reel-container">
      <video
        ref={videoRef}
        src={url}
        className="ric-video"
        loop
        playsInline
        muted={false}
      />
      <div className="ric-overlay">
        <div className="ric-info">
          <div className="ric-user">
            <div className="ric-avatar">R</div>
            <span>Orlune.RIC</span>
          </div>
          <p className="ric-caption">Deep link extracted from Instagram.</p>
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
      const { data: extraction } = await api.get(`/download?url=${encodeURIComponent(url)}`);
      if (extraction.url) {
        // Save to backend for persistence
        const { data: savedReel } = await api.post('/ric', { 
           url: extraction.url, 
           caption: extraction.filename || 'Instagram Reel', 
           username: 'Global' 
        });
        setReels(prev => [savedReel, ...prev]);
        setUrl('');
      } else {
        alert("Could not extract reel.");
      }
    } catch (err) {
      alert("Extraction failed.");
    }
    setLoading(false);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scroll = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const newIndex = Math.round(scroll / height);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  return (
    <div className="ric-root">
      {/* Input Section */}
      <div className="ric-header">
        <div className="ric-input-box">
          <input 
            type="text" 
            placeholder="Paste Instagram Reel Link..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button onClick={extractReel} disabled={loading}>
            {loading ? 'Extracing...' : 'Add Reel'}
          </button>
        </div>
      </div>

      {/* Reel Display Section */}
      <div className="ric-feed-wrapper">
        {reels.length === 0 ? (
          <div className="ric-empty">
            <div className="ric-empty-icon">🎦</div>
            <h2>No Reels Added</h2>
            <p>Paste an Instagram link above to watch here in full-screen vertical swipe mode.</p>
          </div>
        ) : (
          <div 
            className="ric-reels-container" 
            ref={containerRef} 
            onScroll={handleScroll}
          >
            {reels.map((reel, index) => (
              <ReelCard 
                key={reel.id} 
                url={reel.url} 
                isActive={index === currentIndex} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
