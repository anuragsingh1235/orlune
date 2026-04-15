import React from 'react';
import { NavLink } from 'react-router-dom';
import './MobileDock.css';

export default function MobileDock() {
  return (
    <nav className="mobile-dock">
      <NavLink to="/" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <div className="dock-status-dot" title="Orlune Node Live"></div>
        </div>
        <span>Core</span>
      </NavLink>
      
      <NavLink to="/search" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        <span>Search</span>
      </NavLink>

      <NavLink to="/battles" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <span>Gallery</span>
      </NavLink>

      <NavLink to="/social" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <span>Nexus</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <span>Identity</span>
      </NavLink>
    </nav>
  );
}
