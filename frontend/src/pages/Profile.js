import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import notify from '../utils/notify';
import './Profile.css';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profileData, setProfileData] = useState({ name: '', username: '', avatar_url: '', bio: '' });
  const [stats, setStats] = useState({ watchlist: 0, followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Sheet state
  const [activeSheet, setActiveSheet] = useState(null); // 'followers' | 'following' | 'friends'
  const [sheetData, setSheetData] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const [meRes, flwrs, flwng, wl] = await Promise.all([
        api.get('/auth/me'),
        api.get('/social/followers'),
        api.get('/social/following'),
        api.get('/watchlist'),
      ]);
      const userData = meRes.data;
      setProfileData({
        name:       userData.name || '',
        username:   userData.username || '',
        avatar_url: userData.avatar_url || '',
        bio:        userData.bio || '',
      });
      setStats({
        watchlist: Array.isArray(wl.data)    ? wl.data.length    : 0,
        followers: Array.isArray(flwrs.data) ? flwrs.data.length : 0,
        following: Array.isArray(flwng.data) ? flwng.data.length : 0,
      });
    } catch (err) {
      notify.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const openSheet = async (type) => {
    setActiveSheet(type);
    setSheetLoading(true);
    try {
      const ep = type === 'followers' ? '/social/followers'
               : type === 'following' ? '/social/following'
               : '/social/friends';
      const res = await api.get(ep);
      setSheetData(Array.isArray(res.data) ? res.data : []);
    } catch {
      notify.error('Could not load list');
    } finally {
      setSheetLoading(false);
    }
  };

  const closeSheet = () => { setActiveSheet(null); setSheetData([]); };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return notify.error('Image must be under 5MB');
    const reader = new FileReader();
    reader.onloadend = () => setProfileData(prev => ({ ...prev, avatar_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', profileData);
      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('ww_user', JSON.stringify(res.data.user));
      }
      notify.success('Profile updated');
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      notify.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="spinner" style={{ marginTop: 120 }} />;

  const displayAvatar = profileData.avatar_url
    || `https://ui-avatars.com/api/?name=${profileData.username}&background=151A25&color=5E81AC&size=200`;

  return (
    <div className="profile-page container">
      {!isEditing ? (
        <div className="ig-profile-header">
          <div className="ig-header-top">
            <div className="ig-avatar-wrapper">
              <img src={displayAvatar} alt="DP" className="ig-avatar" />
            </div>
            <div className="ig-stats">
              <button className="ig-stat-btn" onClick={() => openSheet('watchlist-view')}>
                <span className="stat-count">{stats.watchlist}</span>
                <span className="stat-label">Watchlist</span>
              </button>
              <button className="ig-stat-btn" onClick={() => openSheet('followers')}>
                <span className="stat-count">{stats.followers}</span>
                <span className="stat-label">Followers</span>
              </button>
              <button className="ig-stat-btn" onClick={() => openSheet('following')}>
                <span className="stat-count">{stats.following}</span>
                <span className="stat-label">Following</span>
              </button>
            </div>
          </div>

          <div className="ig-bio-section">
            <h2 className="ig-name">{profileData.name || profileData.username}</h2>
            <span className="ig-handle">@{profileData.username}</span>
            {profileData.bio && <p className="ig-bio">{profileData.bio}</p>}
          </div>

          <div className="ig-actions">
            <button className="ig-btn primary" onClick={() => setIsEditing(true)}>Edit profile</button>
            <button className="ig-btn" onClick={() => openSheet('friends')}>Friends</button>
          </div>
        </div>
      ) : (
        <div className="ig-edit-card">
          <div className="edit-header">
            <button className="btn-close-edit" onClick={() => setIsEditing(false)}>✕</button>
            <h2>Edit profile</h2>
            <button className="btn-save-edit" onClick={handleSave} disabled={saving}>
              {saving ? '...' : 'Done'}
            </button>
          </div>

          <div className="edit-avatar-section">
            <img src={displayAvatar} alt="DP" className="edit-avatar-preview" />
            <button className="btn-change-photo" onClick={() => fileInputRef.current.click()}>Change photo</button>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
          </div>

          <form className="ig-edit-form" onSubmit={handleSave}>
            <div className="ig-form-group">
              <label>Name</label>
              <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} placeholder="Your name" />
            </div>
            <div className="ig-form-group">
              <label>Username</label>
              <input type="text" value={profileData.username} onChange={e => setProfileData({...profileData, username: e.target.value})} placeholder="Username" />
            </div>
            <div className="ig-form-group">
              <label>Bio</label>
              <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} placeholder="Write something about yourself..." rows={3} />
            </div>
          </form>
        </div>
      )}

      {/* ── BOTTOM SHEET (Followers / Following / Friends) ── */}
      {activeSheet && (
        <div className="sheet-backdrop" onClick={closeSheet}>
          <div className="sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h3>
                {activeSheet === 'followers' ? 'Followers'
                 : activeSheet === 'following' ? 'Following'
                 : 'Friends'}
              </h3>
              <button className="sheet-close" onClick={closeSheet}>✕</button>
            </div>

            <div className="sheet-list">
              {sheetLoading ? (
                <div className="spinner" style={{ margin: '40px auto' }} />
              ) : sheetData.length === 0 ? (
                <div className="sheet-empty">
                  <div className="sheet-empty-icon">
                    {activeSheet === 'followers' ? '👥' : activeSheet === 'following' ? '🔍' : '🤝'}
                  </div>
                  <p>
                    {activeSheet === 'followers' ? 'No one follows you yet' :
                     activeSheet === 'following' ? 'You\'re not following anyone yet' :
                     'No mutual friends yet'}
                  </p>
                </div>
              ) : sheetData.map(u => (
                <div key={u.id} className="sheet-user-row">
                  <div className="sheet-av">
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.username} />
                      : u.username[0].toUpperCase()
                    }
                  </div>
                  <div className="sheet-user-info">
                    <span className="sheet-uname">{u.username}</span>
                    {u.bio && <span className="sheet-ubio">{u.bio}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
