import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import './Social.css';

export default function Social() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [friendWatchlist, setFriendWatchlist] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    let interval;
    if (activeChat) {
      fetchMessages(activeChat.id);
      fetchFriendWatchlist(activeChat.id);
      interval = setInterval(() => fetchMessages(activeChat.id), 3000);
    }
    return () => clearInterval(interval);
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchInitialData = async () => {
    try {
      const [fRes, rRes] = await Promise.all([
        api.get('/social/friends'),
        api.get('/social/requests'),
      ]);
      setFriends(fRes.data);
      setRequests(rRes.data);
    } catch (err) {
      toast.error("Failed to load social archive");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (friendId) => {
    try {
      const res = await api.get(`/chat/history/${friendId}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Chat sync failed");
    }
  };

  const fetchFriendWatchlist = async (friendId) => {
    setWatchlistLoading(true);
    try {
      const res = await api.get(`/watchlist/user/${friendId}`);
      setFriendWatchlist(res.data);
    } catch (err) {
      console.error("Failed to fetch friend archive");
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await api.get(`/social/search?query=${val}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error("Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      await api.post('/social/request', { receiver_id: receiverId });
      toast.success("Connection request sent");
      setSearchResults(prev => prev.map(u => u.id === receiverId ? { ...u, connection_status: 'request_sent' } : u));
    } catch (err) {
      toast.error(err.response?.data?.error || "Request failed");
    }
  };

  const respondToRequest = async (requestId, status) => {
    try {
      await api.post('/social/respond', { requestId, status });
      toast.success(`Request ${status}`);
      fetchInitialData();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    const content = newMessage;
    setNewMessage('');
    try {
      const res = await api.post('/chat/send', { receiver_id: activeChat.id, content });
      setMessages([...messages, res.data]);
    } catch (err) {
      toast.error("Message intercepted or failed");
    }
  };

  const blockUser = async (friendId) => {
    if (!window.confirm("Sever connection and block this user?")) return;
    try {
      await api.post('/social/block', { friendId });
      toast.success("User blacklisted");
      setActiveChat(null);
      fetchInitialData();
    } catch (err) {
      toast.error("Block failed");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="social-page animate-fade">
      
      {/* 👤 SIDEBAR ARCHIVE */}
      <div className="social-sidebar">
        
        {/* User Search */}
        <div className="social-card" style={{ position: 'relative' }}>
          <div className="social-card-header">
            <h3>Find Users</h3>
          </div>
          <div style={{ padding: '12px' }}>
            <input 
              type="text" 
              className="input btn-sm" 
              placeholder="Search by ID or username..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                 {searchResults.map(u => (
                   <div key={u.id} className="search-item" onClick={() => {
                     if (u.connection_status === 'none') sendFriendRequest(u.id);
                   }}>
                      <div className="contact-avatar">{u.username[0].toUpperCase()}</div>
                      <div className="contact-info">
                         <h4>{u.username}</h4>
                         <p>
                           {u.connection_status === 'friends' ? 'Already Friends' :
                            u.connection_status === 'request_sent' ? 'Request Sent' :
                            u.connection_status === 'request_received' ? 'Review Request in Pending Tab' :
                            u.connection_status === 'blocked' ? 'Blocked' :
                            'Click to add friend'}
                         </p>
                      </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Requests */}
        {requests.length > 0 && (
           <div className="social-card requests-shimmer">
              <div className="social-card-header">
                <h3>Friend Requests <span className="badge-count pulse">{requests.length}</span></h3>
              </div>
              <div className="contacts-list">
                 {requests.map(req => (
                   <div key={req.id} className="request-item">
                      <div className="contact-avatar">{req.username[0].toUpperCase()}</div>
                      <div className="contact-info"><h4>{req.username}</h4><p className="request-text">Wants to align</p></div>
                      <div className="request-actions">
                         <button className="premium-btn accept" onClick={() => respondToRequest(req.id, 'accepted')} title="Accept">
                           <span className="premium-icon">✓</span>
                         </button>
                         <button className="premium-btn reject" onClick={() => respondToRequest(req.id, 'rejected')} title="Reject">
                           <span className="premium-icon">✕</span>
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* My Friends */}
        <div className="social-card" style={{ flex: 1 }}>
          <div className="social-card-header">
            <h3>Archived Friends</h3>
          </div>
          <div className="contacts-list">
            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                 No allies found. Find users to start a chat.
              </div>
            ) : (
              friends.map(f => (
                <div 
                  key={f.id} 
                  className={`contact-item ${activeChat?.id === f.id ? 'active' : ''}`}
                  onClick={() => setActiveChat(f)}
                >
                  <div className="contact-avatar">{f.username[0].toUpperCase()}</div>
                  <div className="contact-info">
                    <h4>{f.username}</h4>
                    <p>{f.status === 'blocked' ? '🚫 Connection severed' : 'Ready to transmit'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 📡 TRANSMISSION CENTER (Chat) */}
      <div className="chat-window">
        {activeChat ? (
          <>
            <div className="chat-header">
               <div className="chat-header-info">
                  <div className="contact-avatar">{activeChat.username[0].toUpperCase()}</div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{activeChat.username}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Secure Link Established</p>
                  </div>
               </div>
               <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => blockUser(activeChat.id)}>Block</button>
               </div>
            </div>

            {/* Friend's Watchlist Preview */}
            {activeChat.status === 'accepted' ? (
              <div className="friend-watchlist-preview">
                 <div className="preview-header">
                    <span>WATCHLIST ARCHIVE</span>
                    {watchlistLoading ? <div className="mini-spinner" /> : <span>{friendWatchlist.length} Records</span>}
                 </div>
                 <div className="preview-grid">
                    {friendWatchlist.length > 0 ? (
                      friendWatchlist.map(item => (
                        <div key={item.id} className="preview-item">
                           <img src={item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : 'https://via.placeholder.com/92x138'} alt={item.title} />
                        </div>
                      ))
                    ) : (
                      <div className="empty-preview">No records discovered in this vault.</div>
                    )}
                 </div>
              </div>
            ) : (
              <div className="locked-archive">
                 <div className="locked-icon">🔒</div>
                 <div className="locked-info">
                    <h4>Archive Classified</h4>
                    <p>Requires an active alliance to access this user's records.</p>
                 </div>
              </div>
            )}

            <div className="chat-messages">
               {messages.map((m, idx) => {
                 const isMe = m.sender_id === (friends.find(f => f.id === m.sender_id) ? false : true); // Simplification, server returns sender_id
                 // Accurate Me check: Since friends list contains others, if sender_id is not in friends list, it's Me OR check context
                 // Correct way: use auth user id
                 const meId = JSON.parse(localStorage.getItem('ww_user'))?.id;
                 const isSentByMe = m.sender_id === meId;

                 return (
                   <div key={idx} className={`message ${isSentByMe ? 'sent' : 'received'}`}>
                      <div className="message-bubble">{m.content}</div>
                      <span className="message-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                 );
               })}
               <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
               <form className="chat-input-container" onSubmit={sendMessage}>
                  <input 
                    type="text" 
                    className="chat-input" 
                    placeholder="Type an encrypted message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">Transmit</button>
               </form>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
             <div className="icon">📡</div>
             <h3>Secure Transmission Center</h3>
             <p>Select a contact to initiate an encrypted channel.</p>
          </div>
        )}
      </div>

    </div>
  );
}
