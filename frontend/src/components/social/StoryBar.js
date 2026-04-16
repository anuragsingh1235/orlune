import React from 'react';
import './StoryBar.css';

export default function StoryBar({ stories, onAdd, onView }) {
  // Group stories by user
  const userStories = stories.reduce((acc, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = { ...s, items: [] };
    acc[s.user_id].items.push(s);
    return acc;
  }, {});

  const grouped = Object.values(userStories);

  return (
    <div className="story-bar custom-scrollbar">
      <div className="story-circle add-story" onClick={onAdd}>
        <div className="plus-icon">+</div>
        <span>Your Memory</span>
      </div>
      
      {grouped.map(u => (
        <div key={u.user_id} className="story-circle" onClick={() => onView(u.items)}>
          <div className="story-ring unviewed">
            <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}&background=B48EAD&color=fff`} alt={u.username} />
          </div>
          <span>{u.username}</span>
        </div>
      ))}
    </div>
  );
}
