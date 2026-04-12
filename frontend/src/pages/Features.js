import React, { useState, lazy, Suspense } from 'react';
import './Features.css';
import PdfEditor from './PdfEditor';
import DriveChat from './DriveChat';

const Workshop = lazy(() => import('./Workshop'));

const SECTIONS = {
  drive: {
    id: 'drive',
    badge: 'ORLUNE DRIVE',
    title: 'Downloader',
    desc: 'YouTube, Instagram, and more. Paste a link — get the file.',
    color: '#a855f7',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
  },
  workshop: {
    id: 'workshop',
    badge: 'ORLUNE WORKSHOP',
    title: 'Converter',
    desc: 'Convert PDF, Word, PPT, Excel and any doc format instantly.',
    color: '#3b82f6',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    ),
  },
};

export default function Features() {
  const [active, setActive] = useState(null);

  const toggle = (id) => setActive(prev => (prev === id ? null : id));

  return (
    <div className="features-page fade-in">

      {/* HUB */}
      <div className="features-hub">
        <p className="hub-eyebrow">ORLUNE FEATURES</p>
        <h1 className="hub-title">What do you want to do?</h1>
        <p className="hub-sub">Choose a tool below to get started.</p>

        <div className="hub-cards">
          {Object.values(SECTIONS).map(sec => (
            <button
              key={sec.id}
              className={`hub-card ${active === sec.id ? 'hub-card-active' : ''}`}
              style={{ '--card-color': sec.color }}
              onClick={() => toggle(sec.id)}
            >
              <div className="hub-card-icon">{sec.icon}</div>
              <div className="hub-card-badge">{sec.badge}</div>
              <div className="hub-card-title">{sec.title}</div>
              <div className="hub-card-desc">{sec.desc}</div>
              <div className="hub-card-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points={active === sec.id ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVE TOOL */}
      {active === 'drive' && (
        <div className="tool-panel fade-in">
          <DriveChat />
        </div>
      )}

      {active === 'workshop' && (
        <div className="tool-panel fade-in">
          <Suspense fallback={<div className="workshop-loading">Loading converter...</div>}>
            <Workshop embedded />
          </Suspense>
        </div>
      )}

      {/* PDF EDITOR */}
      <div className="features-divider">
        <div className="divider-line" />
        <span className="divider-label">ORLUNE PDF EDIT</span>
        <div className="divider-line" />
      </div>

      <PdfEditor />

    </div>
  );
}
