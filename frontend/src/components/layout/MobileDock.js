import React from 'react';
import { NavLink } from 'react-router-dom';
import './MobileDock.css';

export default function MobileDock() {
  return (
    <nav className="mobile-dock">
      <NavLink to="/" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">🏠</div>
        <span>Home</span>
      </NavLink>
      
      <NavLink to="/search" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">🔍</div>
        <span>Search</span>
      </NavLink>

      <NavLink to="/battles" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">⚔️</div>
        <span>Arena</span>
      </NavLink>

      <NavLink to="/social" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">💬</div>
        <span>Social</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}>
        <div className="dock-icon">👤</div>
        <span>User</span>
      </NavLink>
    </nav>
  );
}
