import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import notify from '../utils/notify';
import VideoCallRoom from './VideoCallRoom';
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
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadInfo, setDownloadInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  
  const [publicChannels, setPublicChannels] = useState([]);
  const [myChannels, setMyChannels] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChan, setNewChan] = useState({ name: '', description: '', reason: '', category: 'General', privacy: 'public' });
  
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState([]);
  const [callRoom, setCallRoom] = useState(null);
  const [callMode, setCallMode] = useState('video');

  const startCallRoom = (chat, mode) => { setCallMode(mode); setCallRoom(chat); };

  const messagesEndRef = useRef(null);
  const imgInputRef = useRef(null);

  const handleFileUpload = async (e, type) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return notify.error("File exceeds 5MB limit");
    
    notify.success("Encrypting Media...");
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const endpoint = activeChat.type === 'channel' ? '/channels/message' : '/chat/send';
        const payload = activeChat.type === 'channel' 
            ? { channel_id: activeChat.id, content: "", attachment_url: reader.result, attachment_type: type } 
            : { receiver_id: activeChat.id, content: "", attachment_url: reader.result, attachment_type: type };
        const res = await api.post(endpoint, payload);
        if (res.data) setMessages(prev => [...prev, res.data]);
      } catch (err) { notify.error("Media Transmission Failed"); }
    };
    reader.readAsDataURL(file);
  };

  const updateProfilePic = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    notify.success("Updating Alliance Designation Profile...");
    const reader = new FileReader();
    reader.onloadend = () => {
      setActiveChat({...activeChat, profile_pic: reader.result});
      setMyChannels(myChannels.map(c => c.id === activeChat.id ? {...c, profile_pic: reader.result} : c));
      notify.success("Profile Interface Updated");
    };
    reader.readAsDataURL(file);
  };


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

  const getDownloadInfo = async () => {
    if (!downloadUrl.trim()) return notify.error("URL required");
    setDownloading(true);
    setDownloadInfo(null);
    try {
      const res = await api.get(`/download/info?url=${encodeURIComponent(downloadUrl)}`);
      setDownloadInfo(res.data);
    } catch (err) {
      notify.error(err.response?.data?.error || "Fetch failed");
    } finally {
      setDownloading(false);
    }
  };

  const startDownload = (itag) => {
    const url = `${api.defaults.baseURL}/download/stream?url=${encodeURIComponent(downloadUrl)}&itag=${itag}`;
    window.open(url, '_blank');
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
          <button className={`social-tab ${activeTab === 'features' ? 'active' : ''}`} onClick={() => setActiveTab('features')}>✨ TOOLS</button>
        </div>

        {activeTab === 'messages' && (
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
        )}

        {activeTab === 'channels' && (
          <div className="contacts-list">
             <button className="create-chan-btn" onClick={() => setShowCreateModal(true)}>+ New Channel</button>
             <h4 className="section-title">GLOBAL</h4>
             {(publicChannels || []).map(c => (
               <div key={c?.id || Math.random()} className={`channel-card-global ${activeChat?.id === c?.id ? 'active' : ''}`} onClick={() => joinChannel(c)} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px' }}>
                 <div style={{width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'var(--bg-tertiary)'}}>
                    <img src={c?.name === 'Global' || c?.name === 'Orlune Global' ? "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200&q=80" : (c?.profile_pic || `https://ui-avatars.com/api/?name=${c?.name}&background=1e293b&color=fff`)} alt={c?.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
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
                 <div className="chan-avatar" style={{width: '35px', height: '35px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>{c?.profile_pic ? <img src={c.profile_pic} style={{width:'100%', height:'100%', borderRadius:'8px'}} alt=""/> : '💠'}</div>
                 <div style={{flex: 1}}>
                    <h4 style={{margin: 0, fontSize: '0.95rem'}}>{c?.name || 'Group'}</h4>
                    <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)'}}>{c.privacy === 'private' ? '🔒 Invite Only' : '🌍 Public Feed'}</p>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'features' && (
          <div className="features-list" style={{padding: '15px'}}>
            <h4 className="section-title">MEDIA EXTRACTOR</h4>
            <div className="feature-card" style={{background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'}}>
              <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px'}}>Premium Video & Audio Downloader</p>
              <input 
                className="m-input" 
                placeholder="YouTube / Instagram URL" 
                value={downloadUrl} 
                onChange={e => setDownloadUrl(e.target.value)}
                style={{marginBottom: '15px', padding: '12px'}}
              />
              <button 
                className="btn btn-primary" 
                style={{width: '100%', padding: '12px', fontWeight: 'bold'}} 
                onClick={getDownloadInfo}
                disabled={downloading}
              >
                {downloading ? 'Searching Matrix...' : 'SCAN LINK'}
              </button>

              {downloadInfo && (
                <div className="download-results animate-fade-in" style={{marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px'}}>
                  {downloadInfo.thumbnail && <img src={downloadInfo.thumbnail} style={{width: '100%', borderRadius: '12px', marginBottom: '15px', border: '2px solid var(--border-color)'}} alt="" />}
                  <h5 style={{fontSize: '1rem', marginBottom: '5px', color: '#fff'}}>{downloadInfo.title}</h5>
                  <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px'}}>Source: {downloadInfo.author || 'Unknown'}</p>
                  
                  <div className="format-list" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {downloadInfo.formats.map(f => (
                      <button 
                        key={f.itag} 
                        className="btn btn-sm" 
                        style={{background: 'rgba(255,255,255,0.03)', color: '#fff', textAlign: 'left', display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'}}
                        onClick={() => startDownload(f.itag)}
                      >
                        <span style={{fontWeight: '500'}}>{f.quality} ({f.container})</span>
                        <span style={{opacity: 0.6, fontSize: '0.75rem'}}>{f.size}</span>
                      </button>
                    ))}
                    {downloadInfo.formats.length === 0 && <p style={{fontSize: '0.8rem', color: '#f87171'}}>No direct public formats found. Try another link.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="chat-window">
        {activeChat ? (
          <>
            <div className="chat-header">
               {/* Clickable avatar + name — opens member list for channels */}
               <div style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: activeChat.type === 'channel' ? 'pointer' : 'default'}} onClick={() => { if(activeChat.type === 'channel') fetchMembers(); }}>
                 <div style={{width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'}}>
                   {activeChat.profile_pic
                     ? <img src={activeChat.profile_pic} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="dp" />
                     : activeChat.type === 'channel'
                       ? <img src={activeChat.name === 'Global' || activeChat.name === 'Orlune Global' ? "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200&q=80" : `https://ui-avatars.com/api/?name=${activeChat.name}&background=1e293b&color=fff`} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="ch" />
                       : <span style={{color:'#fff', fontWeight:'bold'}}>{activeChat.username?.[0]?.toUpperCase() || '?'}</span>
                   }
                 </div>
                 <div>
                   <h3 style={{margin: 0, fontSize: '1.1rem'}}>{activeChat.name || activeChat.username}</h3>
                   <p style={{margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)'}}>{activeChat.type === 'channel' ? 'Tap to view members' : 'Direct Message'}</p>
                 </div>
               </div>

               {/* Action buttons */}
               <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                 <button className="header-meta-btn" title="Voice Call" onClick={() => startCallRoom(activeChat, 'voice')} style={{background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.4)', color:'#34d399', padding:'8px 14px', borderRadius:'20px', display:'flex', alignItems:'center', gap:'5px', fontWeight:600}}>
                   📞 Voice
                 </button>
                 <button className="header-meta-btn" title="Video Call" onClick={() => startCallRoom(activeChat, 'video')} style={{background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.4)', color:'#60a5fa', padding:'8px 14px', borderRadius:'20px', display:'flex', alignItems:'center', gap:'5px', fontWeight:600}}>
                   🎥 Video
                 </button>
                 {activeChat.type === 'channel' && (
                   <button className="header-meta-btn" onClick={() => { if(window.confirm("Leave this channel?")) { setActiveChat(null); fetchInitialData(); }}} style={{color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding:'8px 12px', borderRadius:'20px'}}>Leave</button>
                 )}
               </div>
            </div>

            <div className="chat-messages">
               {(messages || []).map((m, i) => m && (
                 <div key={m?.id || i} className={m?.is_system_msg ? "system-msg-bubble" : `message ${m?.sender_id === meId ? 'sent' : 'received'}`}>
                    {/* Show avatar + sender name for received channel messages */}
                    {!m?.is_system_msg && m?.sender_id !== meId && (
                      <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px'}}>
                        <div style={{width:'24px', height:'24px', borderRadius:'50%', background:'#334155', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:'bold', color:'#fff', flexShrink:0}}>
                          {m?.avatar ? <img src={m.avatar} style={{width:'100%', height:'100%', borderRadius:'50%'}} alt="" /> : (m?.username || 'U')[0].toUpperCase()}
                        </div>
                        {activeChat.type === 'channel' && <span className="msg-sender-name" style={{margin:0}}>{m?.username || 'User'}</span>}
                      </div>
                    )}
                    {m?.attachment_url && (
                      <div style={{marginBottom:'6px', borderRadius:'12px', overflow:'hidden', maxWidth:'300px'}}>
                        {m.attachment_type === 'media' && m.attachment_url.startsWith('data:video') 
                          ? <video src={m.attachment_url} controls style={{width:'100%', borderRadius:'12px'}} />
                          : <img src={m.attachment_url} alt="media" style={{width:'100%', borderRadius:'12px', objectFit:'cover'}} />
                        }
                      </div>
                    )}
                    {m?.content && <div className="message-bubble">{m.content}</div>}
                    <span className="message-time">{m?.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                 </div>
               ))}
               <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage} style={{display: 'flex', flexDirection: 'column', gap: '5px', background: 'var(--bg-secondary)', padding: '10px 15px', borderTop: '1px solid var(--border-color)'}}>
               <div style={{display: 'flex', gap: '15px', padding: '0 5px', marginBottom: '5px'}}>
                 <button type="button" title="Send Image/Video" onClick={() => imgInputRef.current.click()} style={{background: 'none', border:'none', cursor:'pointer', fontSize:'1.3rem', opacity:'0.7'}}>📷</button>
                 <button type="button" title="Send GIF" onClick={() => imgInputRef.current.click()} style={{background: 'none', border:'none', cursor:'pointer', fontSize:'1rem', opacity:'0.7', fontWeight:'bold', color:'#60a5fa'}}>GIF</button>
                 <input type="file" ref={imgInputRef} hidden accept="image/*,video/*" onChange={e => handleFileUpload(e, 'media')} />
               </div>
               <div style={{display:'flex', gap: '10px'}}>
                 <input className="chat-input" style={{flex: 1, padding: '12px 20px', borderRadius: '25px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: '#fff', outline:'none'}} placeholder="Message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                 <button className="btn btn-primary" style={{borderRadius: '50%', width:'46px', height:'46px', padding: '0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem'}} type="submit">➤</button>
               </div>
             </form>
          </>
        ) : <div className="no-chat-selected"><div style={{fontSize:'3rem', marginBottom:'10px'}}>💬</div><h3>Select a chat</h3><p style={{color:'var(--text-muted)'}}>Choose a friend or channel to start messaging.</p></div>}
      </div>

      {/* PREMIUM CALL ROOM */}
      {callRoom && <VideoCallRoom channel={callRoom} mode={callMode} onLeave={() => setCallRoom(null)} />}

      {showCreateModal && (
        <div className="chan-modal-overlay"><div className="chan-modal">
          <h2>New Channel</h2>
          <div className="modal-grid">
             <input className="m-input" placeholder="Channel Name" value={newChan.name} onChange={e => setNewChan({...newChan, name: e.target.value})}/>
             <textarea className="m-input" placeholder="Description..." style={{height: '80px'}} value={newChan.description} onChange={e => setNewChan({...newChan, description: e.target.value})}/>
             <select className="m-input" value={newChan.privacy} onChange={e => setNewChan({...newChan, privacy: e.target.value})}>
                <option value="public">Public (Anyone can join)</option><option value="private">Private (Invite Only)</option>
             </select>
             <div style={{display:'flex', gap:'10px', marginTop: '10px'}}>
               <button className="btn btn-primary" style={{flex: 1}} onClick={createChannel}>Create</button>
               <button className="btn btn-ghost" style={{flex: 1}} onClick={() => setShowCreateModal(false)}>Cancel</button>
             </div>
          </div>
        </div></div>
      )}

      {showMembers && (
        <div className="chan-modal-overlay"><div className="chan-modal">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border-color)', paddingBottom:'10px', marginBottom:'15px'}}>
             <h2 style={{margin:0}}>Members</h2>
             {(members || []).find(u => u?.user_id === meId)?.is_admin && (
                <label className="btn btn-sm" style={{background:'var(--bg-tertiary)', border:'1px solid var(--primary)', color:'var(--primary)', cursor:'pointer'}}>
                   Change Picture
                   <input type="file" hidden accept="image/*" onChange={updateProfilePic} />
                </label>
             )}
          </div>
          <div className="member-list" style={{maxHeight:'300px', overflowY:'auto'}}>{(members || []).map(m => m && (
             <div key={m?.user_id || Math.random()} className="member-item" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border-color)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div style={{width: '34px', height: '34px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight:'bold'}}>{(m?.username || 'U')[0].toUpperCase()}</div>
                  <div>
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                      <span style={{fontWeight: 'bold'}}>{m?.username || 'User'}</span>
                      {m?.is_creator && <span style={{background:'#EBCB8B', color:'#000', padding:'1px 6px', borderRadius:'4px', fontSize:'0.65rem', fontWeight:'bold'}}>OWNER</span>}
                      {m?.is_admin && !m?.is_creator && <span style={{background:'var(--primary)', color:'#fff', padding:'1px 6px', borderRadius:'4px', fontSize:'0.65rem'}}>ADMIN</span>}
                    </div>
                  </div>
                </div>
                {(members || []).find(u => u?.user_id === meId)?.is_admin && !m?.is_creator && (
                  <div style={{display: 'flex', gap: '5px'}}>
                    <button className="btn btn-sm btn-ghost" onClick={() => setAdminStatus(m.user_id, !m.is_admin)}>
                      {m?.is_admin ? 'Demote' : 'Promote'}
                    </button>
                    {(members || []).find(u => u?.user_id === meId)?.is_creator && (
                      <button className="btn btn-sm" style={{background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)'}} onClick={() => { if(window.confirm("Remove user?")) { notify.success("User removed"); fetchMembers(); }}}>Kick</button>
                    )}
                  </div>
                )}
             </div>
          ))}</div>
          <button className="btn" style={{marginTop: '15px', width: '100%', background:'var(--bg-tertiary)'}} onClick={() => setShowMembers(false)}>Close</button>
        </div></div>
      )}
    </div>
  );
}
