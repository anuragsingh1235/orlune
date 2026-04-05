import { useState, useEffect } from 'react';
import api from '../utils/api';
import './Profile.css';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error("Archive fetch failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="spinner" />;
  if (!user) return <div className="profile-error">ACCESS DENIED: Citizen Record Missing.</div>;

  return (
    <div className="profile-page animate-fade">
      
      <div className="profile-header glass-card">
         <div className="profile-banner"></div>
         <div className="profile-main-info">
            <div className="profile-avatar">{user.username[0].toUpperCase()}</div>
            <div className="profile-text">
               <h2>{user.username}</h2>
               <p className="profile-id">Citizen ID: <span className="highlight">{user.display_id}</span></p>
               <p className="profile-bio">{user.bio || "No archival records found for this citizen."}</p>
            </div>
         </div>
      </div>

      <div className="profile-grid">
         <div className="profile-card bento-item glass-card">
            <h3>Archival Identity</h3>
            <div className="id-card">
               <div className="id-top">
                  <span className="id-label">ORLUNE CITIZEN</span>
                  <span className="id-status">ACTIVE</span>
               </div>
               <div className="id-number">{user.display_id}</div>
               <div className="id-footer">
                  <span>EXP: INDEFINITE</span>
                  <span>LVL: VANGUARD</span>
               </div>
            </div>
         </div>

         <div className="profile-card bento-item glass-card">
            <h3>Social Standing</h3>
            <div className="stats-row">
               <div className="stat-unit">
                  <span className="stat-value">{user.total_points || 0}</span>
                  <span className="stat-label">POINTS</span>
               </div>
               <div className="stat-unit">
                  <span className="stat-value">{user.battle_wins || 0}</span>
                  <span className="stat-label">WINS</span>
               </div>
            </div>
         </div>

         <div className="profile-card bento-item glass-card">
            <h3>Archived Metadata</h3>
            <div className="metadata-list">
               <div className="meta-item"><span>Status:</span> <span className="highlight">Prime</span></div>
               <div className="meta-item"><span>Email:</span> <span className="highlight">{user.email}</span></div>
               <div className="meta-item"><span>Joined:</span> <span className="highlight">{new Date().getFullYear()}</span></div>
            </div>
         </div>
      </div>

    </div>
  );
}
