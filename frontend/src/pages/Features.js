import React, { useState, useEffect, useRef } from 'react';
import './Features.css';

export default function Features() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Welcome to Orlune Nexus! 🌌 Drop any link (Instagram Reel, YouTube Video, WhatsApp Media, etc.) here to instantly unlock its power.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputVal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      // Simulate Bot parsing link
      const botOptionsMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Link detected and analyzed! ⚡ Select your desired extraction format:',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'options',
        options: ['4K UHD', '1080p HD', '720p', '480p', 'MP3 Audio']
      };
      setMessages(prev => [...prev, botOptionsMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleOptionSelect = (optionName) => {
    const userChoiceMsg = {
      id: Date.now(),
      sender: 'user',
      text: `Selected: ${optionName}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };
    setMessages(prev => [...prev, userChoiceMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        sender: 'bot',
        text: `Extraction complete! Your file is ready. 🔥`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'success',
        fileName: `Nexus_Media_${optionName.replace(' ', '_')}.mp4`
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <div className="features-page fade-in">
       <div className="features-header">
           <div className="badge-glow">NEXUS DRIVE</div>
           <h1 className="cyber-title">Universal Downloader</h1>
           <p className="cyber-subtitle">Powered by advanced extraction tech. Fast, simple, and aesthetic.</p>
       </div>
       
       <div className="chat-container">
          <div className="chat-window">
             <div className="chat-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
                     {msg.sender === 'bot' && (
                       <div className="bot-avatar">
                         <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1v2h-1c0 3.87-3.13 7-7 7H9c-3.87 0-7-3.13-7-7H1v-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M9 9a5 5 0 0 0-5 5h16a5 5 0 0 0-5-5H9m3 12a5 5 0 0 0 5-5H7a5 5 0 0 0 5 5z"/></svg>
                       </div>
                     )}
                     <div className={`chat-bubble ${msg.sender} ${msg.type}`}>
                        {msg.type === 'text' && <p>{msg.text}</p>}
                        
                        {msg.type === 'options' && (
                          <div className="options-box">
                             <p className="options-text">{msg.text}</p>
                             <div className="resolution-grid">
                               {msg.options.map((opt, i) => (
                                 <button key={i} className="res-btn" onClick={() => handleOptionSelect(opt)}>
                                   <div className="res-icon-wrap">
                                      {opt.includes('Audio') ? 
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> :
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                                      }
                                   </div>
                                   <span>{opt}</span>
                                 </button>
                               ))}
                             </div>
                          </div>
                        )}

                        {msg.type === 'success' && (
                          <div className="success-dl-box">
                             <p>{msg.text}</p>
                             <div className="dl-card">
                                 <div className="dl-icon">
                                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                 </div>
                                 <div className="dl-info">
                                     <span className="dl-name">{msg.fileName}</span>
                                     <span className="dl-meta">14.2 MB • Ready</span>
                                 </div>
                                 <button className="dl-action-btn">Grab File</button>
                             </div>
                          </div>
                        )}
                        <span className="chat-time">{msg.time}</span>
                     </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="chat-bubble-wrapper bot">
                     <div className="bot-avatar">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1v2h-1c0 3.87-3.13 7-7 7H9c-3.87 0-7-3.13-7-7H1v-2h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M9 9a5 5 0 0 0-5 5h16a5 5 0 0 0-5-5H9m3 12a5 5 0 0 0 5-5H7a5 5 0 0 0 5 5z"/></svg>
                     </div>
                     <div className="chat-bubble bot typing">
                        <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                     </div>
                  </div>
                )}
                <div ref={endOfMessagesRef} />
             </div>
             
             <div className="chat-input-wrapper">
                 <form className="chat-input-area" onSubmit={handleSend}>
                    <div className="input-glass">
                        <svg className="link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        <input 
                          type="text" 
                          placeholder="Paste URL here..." 
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                        />
                        <button type="submit" className="send-btn" disabled={!inputVal.trim()}>
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </div>
                 </form>
             </div>
          </div>
       </div>
    </div>
  );
}
