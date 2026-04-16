import React, { useState, useEffect } from 'react';
import './StoryViewer.css';

export default function StoryViewer({ stories, onClose, onDelete, meId }) {
  const [index, setIndex] = useState(0);
  const current = stories[index];
  const isOwner = current.user_id === meId;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (index < stories.length - 1) {
        setIndex(index + 1);
      } else {
        onClose();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [index, stories, onClose]);

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div className="story-viewer-content" onClick={e => e.stopPropagation()}>
        <div className="story-progress-container">
          {stories.map((_, i) => (
            <div key={i} className="story-progress-bg">
              <div 
                className="story-progress-fill" 
                style={{ 
                  width: i < index ? '100%' : i === index ? '0%' : '0%',
                  animation: i === index ? 'storyProgress 5s linear forwards' : 'none'
                }} 
              />
            </div>
          ))}
        </div>

        <div className="story-header">
           <div className="sh-user">
              <img src={current.avatar_url || `https://ui-avatars.com/api/?name=${current.username}&background=B48EAD&color=fff`} alt={current.username} />
              <span>{current.username}</span>
           </div>
           <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
             {isOwner && (
               <button className="sh-delete" onClick={() => onDelete(current.id)} title="Delete Story">
                 🗑️
               </button>
             )}
             <button className="sh-close" onClick={onClose}>&times;</button>
           </div>
        </div>

        <div className="story-media-container">
          <img src={current.media_url} alt="story" />
          {current.caption && <div className="story-caption">{current.caption}</div>}
        </div>

        <div className="story-nav">
          <div className="s-nav-hit" onClick={() => index > 0 && setIndex(index - 1)} />
          <div className="s-nav-hit" onClick={() => index < stories.length - 1 ? setIndex(index + 1) : onClose()} />
        </div>
      </div>
    </div>
  );
}
