import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import notify from '../utils/notify';
import './Features.css';

export default function DriveChat() {
  const [messages, setMessages] = useState([
    {
      id: 1, sender: 'bot',
      text: 'Welcome to Orlune Drive. Provide a valid media link (YouTube/Instagram) to initiate the high-quality extraction.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeLink, setActiveLink] = useState('');

  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const pushBot = (msg) => setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ...msg }]);

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
          text: `Extracted: ${res.data.title}`, 
          type: 'media_info', 
          info: res.data 
        });
        setIsTyping(false);
      }, 1000);

    } catch (err) {
      const errMsg = err.response?.data?.error || 'Extraction failed. This video might be restricted or require a different access protocol.';
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
            <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
              {msg.sender === 'bot' && (
                <div className="bot-avatar">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
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
