import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import notify from '../utils/notify';
import './Profile.css';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { id } = useParams(); // Public profile ID
  const navigate = useNavigate();
  
  const [profileData, setProfileData] = useState({ id: '', name: '', username: '', avatar_url: '', bio: '' });
  const [stats, setStats] = useState({ watchlist: 0, followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Follow state for public profile
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);

  // Sheet state
  const [activeSheet, setActiveSheet] = useState(null); // 'followers' | 'following' | 'friends' | 'watchlist'
  const [sheetData, setSheetData] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);

  const fileInputRef = useRef(null);
  const isMe = !id || parseInt(id) === user?.id;
  const targetId = isMe ? user?.id : id;

  useEffect(() => { 
    if (targetId) fetchProfile(); 
  }, [id, user?.id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const profileEp = isMe ? '/auth/me' : `/auth/user/${targetId}`;
      const [pRes, sRes] = await Promise.all([
        api.get(profileEp),
        api.get(`/social/stats/${targetId}`)
      ]);

      setProfileData(pRes.data);
      setStats(sRes.data);

      if (!isMe) {
        // Check following status
        const [flwngRes, frndsRes] = await Promise.all([
          api.get('/social/following'),
          api.get('/social/friends')
        ]);
        setIsFollowing(flwngRes.data.some(u => u.id === parseInt(targetId)));
        setIsFriend(frndsRes.data.some(u => u.id === parseInt(targetId)));
      }
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
      let ep = '';
      if (type === 'watchlist') {
          ep = `/watchlist/user/${targetId}`;
      } else {
          ep = `/social/${type}/${targetId}`;
      }
      const res = await api.get(ep);
      setSheetData(Array.isArray(res.data) ? res.data : []);
    } catch {
      notify.error('Access restricted or failed');
    } finally {
      setSheetLoading(false);
    }
  };

  const closeSheet = () => { setActiveSheet(null); setSheetData([]); };

  const toggleFollow = async () => {
    try {
      if (isFollowing) {
        await api.post('/social/unfollow', { followingId: targetId });
        setIsFollowing(false);
        notify.success('Unfollowed');
      } else {
        await api.post('/social/follow', { followingId: targetId });
        setIsFollowing(true);
        notify.success('Following');
      }
      // Refresh stats
      const sRes = await api.get(`/social/stats/${targetId}`);
      setStats(sRes.data);
    } catch {
      notify.error('Action failed');
    }
  };

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
              <div className="ig-stat-btn" onClick={() => openSheet('watchlist')} style={{ cursor: 'pointer' }}>
                <span className="stat-count">{stats.watchlist}</span>
                <span className="stat-label">Watchlist</span>
              </div>
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
            {isMe ? (
                <>
                  <button className="ig-btn primary" onClick={() => setIsEditing(true)}>Edit profile</button>
                  <button className="ig-btn" onClick={() => openSheet('friends')}>Friends</button>
                </>
            ) : (
                <>
                  <button className={`ig-btn ${isFollowing ? '' : 'primary'}`} onClick={toggleFollow}>
                    {isFriend ? '✓ Friends' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button className="ig-btn" onClick={() => navigate('/social')}>Message</button>
                </>
            )}
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

      {/* ── BOTTOM SHEET ── */}
      {activeSheet && (
        <div className="sheet-backdrop" onClick={closeSheet}>
          <div className="sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h3>
                {activeSheet === 'followers' ? 'Followers'
                 : activeSheet === 'following' ? 'Following'
                 : activeSheet === 'friends' ? 'Friends'
                 : 'Watchlist'}
              </h3>
              <button className="sheet-close" onClick={closeSheet}>✕</button>
            </div>

            <div className="sheet-list">
              {sheetLoading ? (
                <div className="spinner" style={{ margin: '40px auto' }} />
              ) : activeSheet === 'watchlist' ? (
                <div className="sheet-grid">
                  {sheetData.length === 0 ? (
                    <div className="sheet-empty">
                       <span style={{ fontSize: '2rem' }}>🎬</span>
                       <p>Archive is empty</p>
                    </div>
                  ) : sheetData.map(m => (
                    <div key={m.id} className="grid-poster-wrap">
                      <img 
                        src={m.poster_path} 
                        alt={m.title} 
                        className="grid-poster" 
                        title={m.title}
                      />
                    </div>
                  ))}
                </div>
              ) : sheetData.length === 0 ? (
                <div className="sheet-empty">
                  <div className="sheet-empty-icon">
                    {activeSheet === 'followers' ? '👥' : activeSheet === 'following' ? '🔍' : '🤝'}
                  </div>
                  <p>
                    {activeSheet === 'followers' ? 'No one follows yet' :
                     activeSheet === 'following' ? 'Not following anyone yet' :
                     'No mutual friends yet'}
                  </p>
                </div>
              ) : sheetData.map(u => (
                <Link key={u.id} to={`/profile/${u.id}`} className="sheet-user-row" onClick={closeSheet}>
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
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
