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
  
  // Channels
  const [publicChannels, setPublicChannels] = useState([]);
  const [myChannels, setMyChannels] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChan, setNewChan] = useState({ name: '', description: '', reason: '', category: 'General', privacy: 'public' });
  
  // Members Management
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
        api.get('/social/friends'),
        api.get('/social/requests'),
        api.get('/channels/list'),
        api.get('/channels/my')
      ]);
      setFriends(fRes.data);
      setRequests(rRes.data);
      setPublicChannels(cRes.data);
      setMyChannels(myCRes.data);
    } catch (err) { notify.error("Sync failed"); }
    finally { setLoading(false); }
  };

  const syncChat = async () => {
    if (!activeChat) return;
    try {
      const endpoint = activeChat.type === 'channel' ? `/channels/history/${activeChat.id}` : `/chat/history/${activeChat.id}`;
      const res = await api.get(endpoint);
      setMessages(res.data);
    } catch (err) {}
  };

  const fetchMembers = async () => {
    if (!activeChat || activeChat.type !== 'channel') return;
    try {
      const res = await api.get(`/channels/members/${activeChat.id}`);
      setMembers(res.data);
      setShowMembers(true);
    } catch (err) { notify.error("Failed to load allies"); }
  };

  const setAdminStatus = async (userId, newStatus) => {
    try {
      await api.post('/channels/admin/toggle', { channel_id: activeChat.id, target_user_id: userId, status: newStatus });
      notify.success("Rank updated");
      fetchMembers();
    } catch (err) { notify.error("Promotion failed"); }
  };

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) { setSearchResults([]); return; }
    try {
      const res = await api.get(`/social/search?query=${val}`);
      setSearchResults(res.data);
    } catch (e) {}
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const endpoint = activeChat.type === 'channel' ? '/channels/message' : '/chat/send';
      const payload = activeChat.type === 'channel' ? { channel_id: activeChat.id, content: newMessage } : { receiver_id: activeChat.id, content: newMessage };
      const res = await api.post(endpoint, payload);
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (e) { notify.error("Relay failed"); }
  };

  const createChannel = async () => {
    try {
      const res = await api.post('/channels/create', newChan);
      notify.success("Hub online");
      fetchInitialData();
      setShowCreateModal(false);
      setActiveChat({...res.data, type: 'channel'});
    } catch (e) { notify.error("Forge failed"); }
  };

  const joinChannel = async (c) => {
    const ok = window.confirm(`Join ${c.name}? All current messages will be decrypted.`);
    if (!ok) return;
    try {
      await api.post('/channels/join', { channel_id: c.id });
      fetchInitialData();
      setActiveChat({...c, type: 'channel'});
      setActiveTab('channels');
    } catch (e) { notify.error("Access denied"); }
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  if (loading) return <div className="spinner" />;
  const meId = JSON.parse(localStorage.getItem('ww_user'))?.id;

  return (
    <div className="social-page animate-fade">
      <div className="social-sidebar">
        <div className="social-tabs">
          <button className={`social-tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>DIRECT</button>
          <button className={`social-tab ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => setActiveTab('channels')}>ALLIANCES</button>
        </div>

        {activeTab === 'messages' ? (
          <>
            <input className="m-input" style={{margin: '10px'}} placeholder="Search Matrix..." value={searchQuery} onChange={e => handleSearch(e.target.value)} />
            {searchResults.length > 0 && (
               <div className="search-results">{searchResults.map(u => (
                 <Link key={u.id} to={`/profile/${u.id}`} className="search-item"><h4>{u.username}</h4></Link>
               ))}</div>
            )}
            <div className="contacts-list">{friends.map(f => (
              <div key={f.id} className={`contact-item ${activeChat?.id === f.id ? 'active' : ''}`} onClick={() => setActiveChat({...f, type: 'friend'})}>
                <h4>{f.username}</h4>
              </div>
            ))}</div>
          </>
        ) : (
          <div className="contacts-list">
             <button className="create-chan-btn" onClick={() => setShowCreateModal(true)}>+ New Channel</button>
             <h4 className="section-title">GLOBAL</h4>
             {publicChannels.map(c => (
               <div key={c.id} className="channel-card-global" onClick={() => joinChannel(c)}>
                 <h4>{c.name}</h4><p>{c.member_count} joined</p>
               </div>
             ))}
             <h4 className="section-title" style={{marginTop: '20px'}}>JOINED</h4>
             {myChannels.map(c => (
               <div key={c.id} className={`channel-item ${activeChat?.id === c.id ? 'active' : ''}`} onClick={() => setActiveChat({...c, type: 'channel'})}>
                 <div className="chan-avatar">#</div><h4>{c.name}</h4>
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="chat-window">
        {activeChat ? (
          <>
            <div className="chat-header">
               <div><h3>{activeChat.name || activeChat.username}</h3><p style={{fontSize: '0.7rem'}}>{activeChat.type === 'channel' ? 'Alliance Feed' : 'Direct Sync'}</p></div>
               <div style={{display: 'flex', gap: '8px'}}>
                 {activeChat.type === 'channel' && <button className="header-meta-btn" onClick={fetchMembers}>👥 Members</button>}
               </div>
            </div>
            
            <div className="chat-messages">
               {messages.map((m, i) => (
                 <div key={i} className={m.is_system_msg ? "system-msg-bubble" : `message ${m.sender_id === meId ? 'sent' : 'received'}`}>
                    {!m.is_system_msg && activeChat.type === 'channel' && m.sender_id !== meId && <span className="msg-sender-name">{m.username}</span>}
                    <div className="message-bubble">{m.content}</div>
                    <span className="message-time">{new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
               ))}
               <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
               <input className="chat-input" placeholder="Broadcasting..." value={newMessage} onChange={e => setNewMessage(e.target.value)} />
               <button className="btn btn-primary btn-sm" type="submit">SEND</button>
            </form>
          </>
        ) : <div className="no-chat-selected"><h3>Matrix Idle</h3></div>}
      </div>

      {showCreateModal && (
        <div className="chan-modal-overlay"><div className="chan-modal">
          <h2>Forged New Alliance</h2>
          <div className="modal-grid">
             <input className="m-input" placeholder="Name..." value={newChan.name} onChange={e => setNewChan({...newChan, name: e.target.value})}/>
             <textarea className="m-input" placeholder="Mission..." value={newChan.description} onChange={e => setNewChan({...newChan, description: e.target.value})}/>
             <select className="m-input" value={newChan.privacy} onChange={e => setNewChan({...newChan, privacy: e.target.value})}>
                <option value="public">Global Feed</option><option value="private">Ghost (Invite Link)</option>
             </select>
             <div style={{display:'flex', gap:'10px'}}>
               <button className="btn btn-primary" onClick={createChannel}>INITIATE</button>
               <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>ABORT</button>
             </div>
          </div>
        </div></div>
      )}

      {showMembers && (
        <div className="chan-modal-overlay"><div className="chan-modal">
          <h2>Alliance Allies</h2>
          <div className="member-list">{members.map(m => (
            <div key={m.user_id} className="member-item">
               <div className="member-name-tag">
                 {m.username} 
                 {m.is_creator && <span className="founder-badge">Founder</span>}
                 {m.is_admin && !m.is_creator && <span className="admin-badge">Admin</span>}
               </div>
               {members.find(u => u.user_id === meId)?.is_admin && !m.is_creator && (
                 <div className="member-actions">
                   <button className="btn btn-sm btn-ghost" onClick={() => setAdminStatus(m.user_id, !m.is_admin)}>
                     {m.is_admin ? 'Demote' : 'Promote'}
                   </button>
                 </div>
               )}
            </div>
          ))}</div>
          <button className="btn btn-primary" style={{marginTop: '20px', width: '100%'}} onClick={() => setShowMembers(false)}>CLOSE</button>
        </div></div>
      )}
    </div>
  );
}
