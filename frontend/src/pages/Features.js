import React, { useState, lazy, Suspense } from 'react';
import './Features.css';
import DriveChat from './DriveChat';
import PdfEditor from './PdfEditor';
import RIC from './RIC';

export default function Features() {
  const [active, setActive] = useState(null); // null | 'drive' | 'pdf' | 'ric'
  const [unlocked, setUnlocked] = useState({ drive: false, pdf: false, ric: false });
  const [passcode, setPasscode] = useState('');

  const handleUnlock = (e) => {
    e.preventDefault();
    const codes = { drive: '1764', pdf: '1764', ric: '1999' };
    if (passcode === codes[active]) {
      setUnlocked({ ...unlocked, [active]: true });
    } else {
      alert("Invalid Beta Authorization Code");
    }
  };

  const renderMaintenance = () => (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', margin: '20px' }}>
      <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '15px' }}>🚧 Under Maintenance</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>This instrument is currently undergoing stability calibration. Authorized testers only.</p>
      
      <form onSubmit={handleUnlock} style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '300px', margin: '0 auto' }}>
        <input 
          type="password" 
          placeholder="Access Code" 
          value={passcode}
          onChange={(e) => { setPasscode(e.target.value); }}
          style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none' }}
        />
        <button type="submit" className="fhub-btn" style={{ padding: '0 20px', background: 'var(--primary)', color: '#fff' }}>Override</button>
      </form>
    </div>
  );

  return (
    <div className="features-page fade-in">

      {/* ── PAGE HEADER ── */}
      <div className="fhub-head">
        <p className="fhub-eyebrow">ORLUNE FEATURES</p>
        <h1 className="fhub-title">
          {active === 'drive' ? 'Downloader' : active === 'pdf' ? 'PDF Studio' : active === 'ric' ? 'RIC Reel Hub' : 'What would you like to do?'}
        </h1>
      </div>

      {/* ── BUTTONS GRID ── */}
      <div className="fhub-buttons">
        <button
          className={`fhub-btn fhub-btn-drive ${active === 'drive' ? 'fhub-btn-active' : ''}`}
          onClick={() => { setActive(active === 'drive' ? null : 'drive'); setPasscode(''); }}
        >
          <span className="fhub-btn-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </span>
          <span className="fhub-btn-label">
            <span className="fhub-btn-name">Orlune Drive</span>
            <span className="fhub-btn-hint">Download media from any link</span>
          </span>
          <span className="fhub-btn-chevron">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={active === 'drive' ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
            </svg>
          </span>
        </button>

        <button
          className={`fhub-btn fhub-btn-pdf ${active === 'pdf' ? 'fhub-btn-active-pdf' : ''}`}
          onClick={() => { setActive(active === 'pdf' ? null : 'pdf'); setPasscode(''); }}
        >
          <span className="fhub-btn-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </span>
          <span className="fhub-btn-label">
            <span className="fhub-btn-name">Orlune PDF Edit</span>
            <span className="fhub-btn-hint">Advanced Editor & OMR Scanner</span>
          </span>
          <span className="fhub-btn-chevron">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={active === 'pdf' ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
            </svg>
          </span>
        </button>

        <button
          className={`fhub-btn fhub-btn-ric ${active === 'ric' ? 'fhub-btn-active' : ''}`}
          onClick={() => { setActive(active === 'ric' ? null : 'ric'); setPasscode(''); }}
        >
          <span className="fhub-btn-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </span>
          <span className="fhub-btn-label">
            <span className="fhub-btn-name">RIC Reel Hub</span>
            <span className="fhub-btn-hint">Interactive Instagram Experience</span>
          </span>
          <span className="fhub-btn-chevron">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points={active === 'ric' ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
            </svg>
          </span>
        </button>
      </div>

      {/* ── TOOL PANEL ── */}
      {active === 'drive' && (
        <div className="ftool-panel fade-in">
          {unlocked.drive ? <DriveChat /> : renderMaintenance()}
        </div>
      )}

      {active === 'pdf' && (
        <div className="ftool-panel fade-in">
          {unlocked.pdf ? <PdfEditor /> : renderMaintenance()}
        </div>
      )}

      {active === 'ric' && (
        <div className="ftool-panel fade-in">
          {unlocked.ric ? <RIC /> : renderMaintenance()}
        </div>
      )}

    </div>
  );
}
