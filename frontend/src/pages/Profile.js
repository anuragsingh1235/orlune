import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Profile.css';

export default function Profile() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({ avatar_url: '', bio: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data) {
        setProfileData({
          avatar_url: res.data.avatar_url || '',
          bio: res.data.bio || ''
        });
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/profile', profileData);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="spinner" style={{ marginTop: 120 }} />;

  const displayAvatar = profileData.avatar_url || 'https://via.placeholder.com/150/1a1a2e/ffffff?text=' + (user?.username?.[0]?.toUpperCase() || 'U');

  return (
    <div className="profile-page container">
      <div className="profile-header">
        <div className="profile-banner">
            <div className="banner-overlay"></div>
        </div>
        <div className="profile-avatar-container">
            <img src={displayAvatar} alt="Avatar" className="profile-avatar-img" />
            <div className="avatar-edit-overlay">
                <span>Update DP</span>
            </div>
        </div>
        <div className="profile-title">
          <h1>{user?.username}</h1>
          <p className="profile-email">{user?.email}</p>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <h2>Edit Profile</h2>
          <form className="profile-form" onSubmit={handleSave}>
            <div className="form-group">
              <label>Profile Picture URL (DP)</label>
              <input
                type="text"
                placeholder="https://example.com/my-avatar.jpg"
                value={profileData.avatar_url}
                onChange={(e) => setProfileData({ ...profileData, avatar_url: e.target.value })}
              />
              <small className="form-hint">Paste an image URL to set your display picture</small>
            </div>

            <div className="form-group">
              <label>Bio & Strategy</label>
              <textarea
                placeholder="Write your movie preferences and battle strategy..."
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                rows="4"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-save" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
