import React from 'react';

/**
 * 🔥 NAVBAR SPACER (The "Hotch Potch" Killer)
 * This component is a simple 100% width block that matches the height of 
 * the fixed transparent navbar. It ensures that any page content starts 
 * exactly below the header, preventing any overlaps (hotch-potch).
 */
export default function NavbarSpacer() {
  return (
    <div className="navbar-spacer" style={{ 
      width: '100%', 
      pointerEvents: 'none',
      display: 'block',
      position: 'relative'
    }} />
  );
}
