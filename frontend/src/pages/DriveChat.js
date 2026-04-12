import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import notify from '../utils/notify';
import './Features.css';

export default function DriveChat() {
  const [messages, setMessages] = useState([
    {
      id: 1, sender: 'node',
      text: 'Good evening. I am AIRA, your Retrieval Assistant. Please provide a link, and I will begin the synchronization process for you.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeLink, setActiveLink] = useState('');

  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const pushBot = (msg) => setMessages(prev => [...prev, { id: Date.now(), sender: 'node', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ...msg }]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const userInput = inputVal.trim();

    setMessages(prev => [...prev, {
      id: Date.now(), sender: 'user', text: userInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'text'
    }]);
    setInputVal('');
    setIsTyping(true);

    try {
      const res = await api.get(`/download/info?url=${encodeURIComponent(userInput)}`);
      setActiveLink(userInput);
      
      setTimeout(() => {
        pushBot({ 
          text: `Synchronization complete. I have retrieved "${res.data.title}" for you.`, 
          type: 'media_info', 
          info: res.data 
        });
        setIsTyping(false);
      }, 1000);

    } catch (err) {
      const errMsg = err.response?.data?.error || "I'm sorry, I encountered an issue while retrieving that content. Please verify the link is public.";
      setTimeout(() => {
        pushBot({ text: errMsg, type: 'text' });
        setIsTyping(false);
      }, 1000);
    }

  };

  const initiateDownload = (f) => {
    notify.success("Opening Professional Stream...");
    const dlUrl = `${api.defaults.baseURL}/download/stream?directUrl=${encodeURIComponent(f.directUrl)}`;
    window.open(dlUrl, '_blank');
  };


  return (
    <div className="chat-container">
      <div className="chat-window">
        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender === 'node' ? 'bot' : 'user'}`}>
              {msg.sender === 'node' && (
                <div className="bot-avatar" style={{ color: '#d946ef', borderRadius: '50%' }}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <path d="M12 3c.132 0 .263 0 .393 0a.75.75 0 0 0 .534-1.281l-.014-.014a9.752 9.752 0 0 0-13.48 13.48l.014.014a.75.75 0 0 0 1.281-.534c0-.13 0-.26 0-.393a7.5 7.5 0 0 1 11.272-6.5zm8.172 8.172a.75.75 0 0 0-1.281.534c0 .13 0 .26 0 .393a7.5 7.5 0 0 1-11.272 6.5.75.75 0 0 0-.534 1.281l.014.014a9.752 9.752 0 0 0 13.48-13.48l-.014-.014z"/>
                     <path d="M12 3v18"/>
                     <path d="M3 12h18"/>
                   </svg>
                </div>
              )}
              <div className={`chat-bubble ${msg.sender} ${msg.type || ''}`}>
                {msg.type === 'text' && <p>{msg.text}</p>}
                
                {msg.type === 'media_info' && (
                  <div className="media-info-box">
                    <img src={msg.info.thumbnail} alt="thumb" className="media-thumb" />
                    <h5 className="media-title">{msg.info.title}</h5>
                    <p className="media-author">{msg.info.author}</p>
                    <div className="res-grid-premium">
                      {msg.info.formats.map(f => (
                        <button key={f.itag} className="res-btn-premium" onClick={() => initiateDownload(f)}>
                          <span className="res-label">{f.quality} ({f.container})</span>
                          <span className="res-size">{f.size}</span>
                        </button>
                      ))}

                    </div>
                  </div>
                )}

                <span className="chat-time">{msg.time}</span>
              </div>
            </div>
          ))}
          {isTyping && <div className="chat-typing-dot"><span/><span/><span/></div>}
          <div ref={endRef} />
        </div>
        <div className="chat-input-wrapper">
          <form className="chat-input-area" onSubmit={handleSend}>
            <div className="input-glass">
              <input
                type="text"
                placeholder="Paste YouTube/Instagram link..."
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
              />
              <button type="submit" className="send-btn-cool">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
