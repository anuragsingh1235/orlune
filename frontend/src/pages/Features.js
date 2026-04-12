import React, { useState, lazy, Suspense } from 'react';
import './Features.css';
import DriveChat from './DriveChat';
import PdfEditor from './PdfEditor'; // Static import for stability

export default function Features() {
  const [active, setActive] = useState(null); // null | 'drive' | 'pdf'

  return (
    <div className="features-page fade-in">

      {/* ── PAGE HEADER ── */}
      <div className="fhub-head">
        <p className="fhub-eyebrow">ORLUNE FEATURES</p>
        <h1 className="fhub-title">
          {active === 'drive' ? 'Downloader' : active === 'pdf' ? 'PDF Studio' : 'What would you like to do?'}
        </h1>
      </div>

      {/* ── TWO BUTTONS ── */}
      <div className="fhub-buttons">
        <button
          className={`fhub-btn fhub-btn-drive ${active === 'drive' ? 'fhub-btn-active' : ''}`}
          onClick={() => setActive(active === 'drive' ? null : 'drive')}
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
          onClick={() => setActive(active === 'pdf' ? null : 'pdf')}
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
      </div>

      {/* ── TOOL PANEL ── */}
      {active === 'drive' && (
        <div className="ftool-panel fade-in">
          <DriveChat />
        </div>
      )}

      {active === 'pdf' && (
        <div className="ftool-panel fade-in">
          <PdfEditor />
        </div>
      )}

    </div>
  );
}
