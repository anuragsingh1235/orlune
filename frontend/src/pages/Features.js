import React, { useState } from 'react';
import './Features.css';

export default function Features() {
  const [inputVal, setInputVal] = useState('');

  const extractYTId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\??v?=?))([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleDownload = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const id = extractYTId(inputVal);
    
    // Redirecting to the most famous working downloader center
    // This ensures it works for all resolutions and formats natively
    const finalUrl = id 
      ? `https://www.y2mate.com/youtube-mp4/${id}` 
      : `https://savefrom.net/?url=${encodeURIComponent(inputVal)}`;
      
    window.open(finalUrl, '_blank');
  };

  return (
    <div className="features-page fade-in">
       <div className="features-header">
           <div className="badge-glow">ORLUNE DOWNLOAD</div>
           <h1 className="cyber-title">Simple & Fast</h1>
           <p className="cyber-subtitle">Paste your link below and hit download. Direct, simple, and works every time. 🚀</p>
       </div>
       
       <div className="simple-downloader">
          <form className="download-form" onSubmit={handleDownload}>
              <div className="input-glass-large">
                  <svg className="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Paste YouTube or Media URL here..." 
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    autoFocus
                  />
              </div>
              <button type="submit" className="download-btn-pro" disabled={!inputVal.trim()}>
                 <span>DOWNLOAD NOW</span>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                 </svg>
              </button>
          </form>
       </div>

       <div className="pro-tips">
          <div className="tip-card">
              <div className="tip-icon">⚡</div>
              <h3>Ultimate Speed</h3>
              <p>No waiting, no processing bars. Just direct redirection to the best extraction engine.</p>
          </div>
          <div className="tip-card">
              <div className="tip-icon">🛡️</div>
              <h3>100% Secure</h3>
              <p>Powered by the world's most famous downloader infrastructure for your safety.</p>
          </div>
       </div>
    </div>
  );
}
