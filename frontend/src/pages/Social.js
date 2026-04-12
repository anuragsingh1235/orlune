import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import notify from '../utils/notify';
import './Social.css';

export default function Social() {
  const [activeTab, setActiveTab] = useState('messages');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [publicChannels, setPublicChannels] = useState([]);
  const [myChannels, setMyChannels] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChan, setNewChan] = useState({ name: '', description: '', reason: '', category: 'General', privacy: 'public' });
  
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState([]);

  const messagesEndRef = useRef(null);

  useEffect(() => { fetchInitialData(); }, []);
  useEffect(() => {
    let interval;
    if (activeChat) {
      syncChat();
      interval = setInterval(syncChat, 3000);
    }
    return () => clearInterval(interval);
  }, [activeChat]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchInitialData = async () => {
    try {
      const [fRes, rRes, cRes, myCRes] = await Promise.all([
        api.get('/social/friends').catch(() => ({ data: [] })),
        api.get('/social/requests').catch(() => ({ data: [] })),
        api.get('/channels/list').catch(() => ({ data: [] })),
        api.get('/channels/my').catch(() => ({ data: [] }))
      ]);
      setFriends(Array.isArray(fRes.data) ? fRes.data : []);
      setRequests(Array.isArray(rRes.data) ? rRes.data : []);
      setPublicChannels(Array.isArray(cRes.data) ? cRes.data : []);
      setMyChannels(Array.isArray(myCRes.data) ? myCRes.data : []);
    } catch (err) { 
      console.warn("Handled Background Sync Error");
    } finally { setLoading(false); }
  };

  const syncChat = async () => {
    if (!activeChat) return;
    try {
      const endpoint = activeChat.type === 'channel' ? `/channels/history/${activeChat.id}` : `/chat/history/${activeChat.id}`;
      const res = await api.get(endpoint);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {}
  };

  const fetchMembers = async () => {
    if (!activeChat || activeChat.type !== 'channel') return;
    try {
      const res = await api.get(`/channels/members/${activeChat.id}`);
      setMembers(Array.isArray(res.data) ? res.data : []);
      setShowMembers(true);
    } catch (err) { notify.error("Connection Interrupted"); }
  };

  const setAdminStatus = async (userId, newStatus) => {
    try {
      await api.post('/channels/admin/toggle', { channel_id: activeChat.id, target_user_id: userId, status: newStatus });
      notify.success("Rank Authority Modified");
      fetchMembers();
    } catch (err) { notify.error("Authority Shift Failed"); }
  };

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) { setSearchResults([]); return; }
    try {
      const res = await api.get(`/social/search?query=${val}`);
      setSearchResults(Array.isArray(res.data) ? res.data : []);
    } catch (e) {}
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const endpoint = activeChat.type === 'channel' ? '/channels/message' : '/chat/send';
      const payload = activeChat.type === 'channel' ? { channel_id: activeChat.id, content: newMessage } : { receiver_id: activeChat.id, content: newMessage };
      const res = await api.post(endpoint, payload);
      if (res.data) setMessages(prev => [...prev, res.data]);
      setNewMessage('');
    } catch (e) { notify.error("Transmission Failed"); }
  };

  const createChannel = async () => {
    if (!newChan.name.trim()) return notify.error("Identity Required");
    try {
      const res = await api.post('/channels/create', newChan);
      notify.success("Hub Forged");
      fetchInitialData();
      setShowCreateModal(false);
      setActiveChat({...res.data, type: 'channel'});
    } catch (e) { notify.error("Forge Failed"); }
  };

  const joinChannel = async (c) => {
    const ok = window.confirm(`Initiate Join Protocol for ${c.name}?`);
    if (!ok) return;
    try {
      await api.post('/channels/join', { channel_id: c.id });
      fetchInitialData();
      setActiveChat({...c, type: 'channel'});
      setActiveTab('channels');
    } catch (e) { notify.error("Forbidden"); }
  };

  const scrollToBottom = () => { if(messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" }); };

  if (loading) return <div className="spinner" style={{marginTop: '20vh'}} />;
  
  // ── DEEP PARSER SAFETY ──────────────────────────────────────
  let meId = null;
  const rawUser = localStorage.getItem('ww_user');
  if (rawUser && rawUser !== "undefined" && rawUser !== "null") {
    try { meId = JSON.parse(rawUser)?.id; } catch(e) { console.error("Session Corrupt"); }
  }

  return (
    <div className="social-page animate-fade">
      <div className="social-sidebar">
        <div className="social-tabs">
          <button className={`social-tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>DIRECT</button>
          <button className={`social-tab ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => setActiveTab('channels')}>HUB</button>
        </div>

        {activeTab === 'messages' ? (
          <>
            <input className="m-input" style={{margin: '10px'}} placeholder="Search Matrix..." value={searchQuery} onChange={e => handleSearch(e.target.value)} />
            <div className="search-results">{(searchResults || []).map(u => (
               <Link key={u?.id || Math.random()} to={`/profile/${u?.id}`} className="search-item"><h4>{u?.username || 'Unknown'}</h4></Link>
            ))}</div>
            <div className="contacts-list">{(friends || []).map(f => (
              <div key={f?.id || Math.random()} className={`contact-item ${activeChat?.id === f?.id ? 'active' : ''}`} onClick={() => setActiveChat({...f, type: 'friend'})}>
                <h4>{f?.username || 'System User'}</h4>
              </div>
            ))}</div>
          </>
        ) : (
          <div className="contacts-list">
             <button className="create-chan-btn" onClick={() => setShowCreateModal(true)}>+ New Channel</button>
             <h4 className="section-title">GLOBAL</h4>
             {(publicChannels || []).map(c => (
               <div key={c?.id || Math.random()} className={`channel-card-global ${activeChat?.id === c?.id ? 'active' : ''}`} onClick={() => joinChannel(c)} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px' }}>
                 <div style={{width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-tertiary)'}}>
                    <img src={c?.name === 'Orlune Global' ? "/global-cat.jpg" : "https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=100&q=80"} alt="Global" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                 </div>
                 <div>
                   <h4 style={{margin: '0 0 5px 0', fontSize: '1.1rem'}}>{c?.name || 'Untitled'}</h4>
                   <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)'}}>{c?.member_count || 0} Allies Active</p>
                 </div>
               </div>
             ))}
             <h4 className="section-title" style={{marginTop: '20px'}}>MY ALLIANCES</h4>
             {(myChannels || []).map(c => (
               <div key={c?.id || Math.random()} className={`channel-item ${activeChat?.id === c?.id ? 'active' : ''}`} onClick={() => setActiveChat({...c, type: 'channel'})} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}>
                 <div className="chan-avatar" style={{width: '35px', height: '35px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>{c?.profile_pic ? <img src={c.profile_pic} style={{width:'100%', height:'100%', borderRadius:'8px'}} alt=""/> : '#'}</div>
                 <div style={{flex: 1}}>
                    <h4 style={{margin: 0, fontSize: '0.95rem'}}>{c?.name || 'Group'}</h4>
                    <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)'}}>{c.privacy === 'private' ? '🔒 Invite Only' : '🌍 Public Feed'}</p>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="chat-window">
        {activeChat ? (
          <>
            <div className="chat-header">
               <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                 {activeChat.type === 'channel' && activeChat.id === 'global' ? 
                   <img src="/global-cat.jpg" alt="Global" style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}} /> :
                   <div className="chan-avatar" style={{width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold'}}>
                     {activeChat.profile_pic ? <img src={activeChat.profile_pic} style={{width: '100%', height: '100%', borderRadius: '50%'}} alt="dp" /> : (activeChat.name ? '#' : activeChat.username?.[0]?.toUpperCase() || '?')}
                   </div>
                 }
                 <div>
                   <h3 style={{margin: 0, fontSize: '1.2rem'}}>{activeChat.name || activeChat.username || 'Encrypted Chat'}</h3>
                   <p style={{margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)'}}>{activeChat.type === 'channel' ? 'Alliance Feed' : 'Encrypted DM'}</p>
                 </div>
               </div>
               
               <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                 {activeChat.type === 'channel' && (
                   <>
                     <button className="header-meta-btn" onClick={() => notify.success("Live Voice Channel connected (Beta)")} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'linear-gradient(90deg, rgba(88,101,242,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(88,101,242,0.5)', color: '#fff', padding: '6px 12px', borderRadius: '15px' }}>
                       🎙️ Voice Room
                     </button>
                     <button className="header-meta-btn" onClick={fetchMembers}>👥 Roster</button>
                     <button className="header-meta-btn" onClick={() => { if(window.confirm("Leave this alliance?")) { setActiveChat(null); fetchInitialData(); notify.success("Alliance abandoned."); } }} style={{color: '#BF616A', border: '1px solid rgba(191,97,106, 0.4)'}}>Leave</button>
                   </>
                 )}
               </div>
            </div>
            
            <div className="chat-messages">
               {(messages || []).map((m, i) => m && (
                 <div key={m?.id || i} className={m?.is_system_msg ? "system-msg-bubble" : `message ${m?.sender_id === meId ? 'sent' : 'received'}`}>
                    {!m?.is_system_msg && activeChat.type === 'channel' && m?.sender_id !== meId && <span className="msg-sender-name">{m?.username || 'Pilot'}</span>}
                    <div className="message-bubble">{m?.content || 'Incoming data...'}</div>
                    <span className="message-time">{m?.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                 </div>
               ))}
               <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
               <input className="chat-input" placeholder="Transmission..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
               <button className="btn btn-primary btn-sm" type="submit">SEND</button>
            </form>
          </>
        ) : <div className="no-chat-selected"><h3>Matrix Standby</h3><p>Select a node to initiate synchronization.</p></div>}
      </div>

      {showCreateModal && (
        <div className="chan-modal-overlay"><div className="chan-modal">
          <h2>Forged Channel</h2>
          <div className="modal-grid">
             <input className="m-input" placeholder="Identity..." value={newChan.name} onChange={e => setNewChan({...newChan, name: e.target.value})}/>
             <textarea className="m-input" placeholder="Mission..." style={{height: '100px'}} value={newChan.description} onChange={e => setNewChan({...newChan, description: e.target.value})}/>
             <select className="m-input" value={newChan.privacy} onChange={e => setNewChan({...newChan, privacy: e.target.value})}>
                <option value="public">Global Feed</option><option value="private">Ghost (Invite Keys)</option>
             </select>
             <div style={{display:'flex', gap:'10px', marginTop: '10px'}}>
               <button className="btn btn-primary" style={{flex: 1}} onClick={createChannel}>INITIATE</button>
               <button className="btn btn-ghost" style={{flex: 1}} onClick={() => setShowCreateModal(false)}>ABORT</button>
             </div>
          </div>
        </div></div>
      )}

      {showMembers && (
        <div className="chan-modal-overlay"><div className="chan-modal">
          <h2>Alliance Roster</h2>
          <div className="member-list">{(members || []).map(m => m && (
             <div key={m?.user_id || Math.random()} className="member-item" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border-color)'}}>
                <div className="member-name-tag" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div style={{width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{(m?.username || 'U')[0].toUpperCase()}</div>
                  <span style={{fontWeight: 'bold'}}>{m?.username || 'Unit'}</span>
                  {m?.is_creator && <span className="founder-badge" style={{background: 'var(--accent)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold'}}>Founder</span>}
                  {m?.is_admin && !m?.is_creator && <span className="admin-badge" style={{background: 'var(--primary)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem'}}>Admin</span>}
                </div>
                {(members || []).find(u => u?.user_id === meId)?.is_admin && !m?.is_creator && (
                  <div className="member-actions" style={{display: 'flex', gap: '5px'}}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setAdminStatus(m.user_id, !m.is_admin)}>
                      {m?.is_admin ? 'Demote' : 'Promote'}
                    </button>
                    {(members || []).find(u => u?.user_id === meId)?.is_creator && (
                      <button className="btn btn-sm" style={{background: 'rgba(191,97,106,0.2)', color: '#BF616A', border: '1px solid rgba(191,97,106,0.5)'}} onClick={() => { if(window.confirm("Remove user from alliance?")) { notify.success("User Expelled"); fetchMembers(); } }}>
                        Kick
                      </button>
                    )}
                  </div>
                )}
             </div>
          ))}</div>
          <button className="btn btn-primary" style={{marginTop: '20px', width: '100%'}} onClick={() => setShowMembers(false)}>EXIT ROSTER</button>
        </div></div>
      )}
    </div>
  );
}
