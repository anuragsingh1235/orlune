import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Profile.css';

export default function Profile() {
  const { user, login } = useAuth(); // Need to update context user if username changes
  const [profileData, setProfileData] = useState({ name: '', username: '', avatar_url: '', bio: '' });
  const [stats, setStats] = useState({ battles: 0, friends: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data) {
        setProfileData({
          name: res.data.name || '',
          username: res.data.username || '',
          avatar_url: res.data.avatar_url || '',
          bio: res.data.bio || ''
        });
      }
      // Also fetch friends count
      const friendsRes = await api.get('/social/friends');
      setStats(prev => ({ ...prev, friends: Array.isArray(friendsRes.data) ? friendsRes.data.length : 0 }));
      
      const battlesRes = await api.get('/battles/my');
      setStats(prev => ({ ...prev, battles: Array.isArray(battlesRes.data) ? battlesRes.data.length : 0 }));
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be less than 2MB");
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileData(prev => ({ ...prev, avatar_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', profileData);
      toast.success('Profile updated successfully!');
      
      if (res.data?.user?.username !== user.username) {
         // Optionally update local storage token logic if JWT holds username, 
         // but for now just refresh to apply changes
         setTimeout(() => window.location.reload(), 1000);
      }
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="spinner" style={{ marginTop: 120 }} />;

  const displayAvatar = profileData.avatar_url || 'https://via.placeholder.com/150/1a1a2e/ffffff?text=' + (profileData.username?.[0]?.toUpperCase() || 'U');

  return (
    <div className="profile-page container">
      {!isEditing ? (
        <div className="ig-profile-header">
           <div className="ig-header-top">
              <div className="ig-avatar-wrapper">
                 <img src={displayAvatar} alt="DP" className="ig-avatar" />
              </div>
              <div className="ig-stats">
                 <div className="ig-stat"><span className="stat-count">{stats.battles}</span><span className="stat-label">Battles</span></div>
                 <div className="ig-stat"><span className="stat-count">{stats.friends}</span><span className="stat-label">Allies</span></div>
                 <div className="ig-stat"><span className="stat-count">0</span><span className="stat-label">Following</span></div>
              </div>
           </div>
           
           <div className="ig-bio-section">
              <h2 className="ig-name">{profileData.name || profileData.username}</h2>
              <p className="ig-bio">{profileData.bio}</p>
           </div>
           
           <div className="ig-actions">
              <button className="ig-btn" onClick={() => setIsEditing(true)}>Edit profile</button>
              <button className="ig-btn">Share profile</button>
           </div>
        </div>
      ) : (
        <div className="ig-edit-card">
           <div className="edit-header">
             <button className="btn-close-edit" onClick={() => setIsEditing(false)}>✕</button>
             <h2>Edit profile</h2>
             <button className="btn-save-edit" onClick={handleSave} disabled={saving}>{saving ? '...' : 'Done'}</button>
           </div>
           
           <div className="edit-avatar-section">
              <img src={displayAvatar} alt="DP" className="edit-avatar-preview" />
              <button className="btn-change-photo" onClick={() => fileInputRef.current.click()}>Change profile photo</button>
              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
           </div>

           <form className="ig-edit-form">
              <div className="ig-form-group">
                <label>Name</label>
                <input type="text" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} placeholder="Name" />
              </div>
              <div className="ig-form-group">
                <label>Username</label>
                <input type="text" value={profileData.username} onChange={(e) => setProfileData({...profileData, username: e.target.value})} placeholder="Username" />
              </div>
              <div className="ig-form-group">
                <label>Bio</label>
                <textarea value={profileData.bio} onChange={(e) => setProfileData({...profileData, bio: e.target.value})} placeholder="Bio" rows={3}></textarea>
              </div>
           </form>
        </div>
      )}
    </div>
  );
}
