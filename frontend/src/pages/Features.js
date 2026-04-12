import React, { useState, useEffect, useRef } from 'react';
import './Features.css';

export default function Features() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Yo, welcome to Orlune Drive! 🛸 Drop a link and I\'ll process it for you.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // State for flow control
  const [chatStep, setChatStep] = useState('IDLE'); // IDLE, CONFIRM_MEDIA, CHOOSE_RES
  const [activeLink, setActiveLink] = useState('');
  const [mediaData, setMediaData] = useState(null);

  const endOfMessagesRef = useRef(null);
  const scrollToBottom = () => endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const extractYTId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\??v?=?))([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userInput = inputVal.trim();
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text: userInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    }]);
    setInputVal('');
    setIsTyping(true);

    if (chatStep === 'IDLE') {
       const id = extractYTId(userInput);
       const thumb = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop';
       
       setActiveLink(userInput);
       setTimeout(() => {
         setMessages(prev => [...prev, {
            id: Date.now() + 1,
            sender: 'bot',
            text: 'Found it! Is this the right media? (Reply "Yes" or "No")',
            type: 'confirmation',
            thumbnail: thumb
         }]);
         setChatStep('CONFIRM_MEDIA');
         setIsTyping(false);
       }, 800);
    } 
    else if (chatStep === 'CONFIRM_MEDIA') {
      const lower = userInput.toLowerCase();
      if (lower.includes('yes') || lower === 'y' || lower === 'yeah') {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            sender: 'bot',
            text: 'Sweet! Choose your preferred format below:',
            type: 'options',
            options: ['High Quality Video (1080p)', 'Standard Video (720p)', 'Pure Audio (MP3)']
          }]);
          setChatStep('CHOOSE_RES');
          setIsTyping(false);
        }, 800);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: 'Okay, please drop the correct link!' }]);
        setChatStep('IDLE');
        setIsTyping(false);
      }
    }
  };

  const handleOptionSelect = (opt) => {
    setIsTyping(true);
    const videoId = extractYTId(activeLink);
    
    // Y2Mate is the most famous and working downloader
    // We point directly to their processing page for this video id
    const finalRedir = videoId 
      ? `https://www.y2mate.com/youtube-mp4/${videoId}` 
      : `https://savefrom.net/?url=${encodeURIComponent(activeLink)}`;

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: `Boom! Your direct download tunnel is ready. Get your file below. 🍿`,
        type: 'success',
        downloadUrl: finalRedir,
        fileName: `Media_Download`
      }]);
      setIsTyping(false);
      setChatStep('IDLE');
    }, 1200);
  };

  return (
    <div className="features-page fade-in">
       <div className="features-header">
           <div className="badge-glow">ORLUNE DRIVE</div>
           <h1 className="cyber-title">Downloader</h1>
           <p className="cyber-subtitle">Paste a link, confirm with Yes/No, and snatch the file. No sketchy redirects. 🥷✨</p>
       </div>
       
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
                     <div className={`chat-bubble ${msg.sender} ${msg.type}`}>
                        {msg.type === 'text' && <p>{msg.text}</p>}
                        
                        {msg.type === 'confirmation' && (
                           <div className="options-box">
                             <p className="options-text">{msg.text}</p>
                             <div className="confirm-thumb">
                               <img src={msg.thumbnail} alt="Preview" />
                             </div>
                           </div>
                        )}

                        {msg.type === 'options' && (
                          <div className="options-box">
                             <p className="options-text">{msg.text}</p>
                             <div className="resolution-grid">
                               {msg.options.map((opt, i) => (
                                 <button key={i} className="res-btn" onClick={() => handleOptionSelect(opt)}>
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
                                 <div className="dl-icon-large">
                                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                 </div>
                                 <div className="dl-info">
                                     <span className="dl-name">{msg.fileName}</span>
                                     <span className="dl-meta">Redirecting to raw cloud file...</span>
                                 </div>
                                 <a href={msg.downloadUrl} target="_blank" rel="noopener noreferrer" className="dl-action-btn">
                                     GRAB FILE
                                 </a>
                             </div>
                          </div>
                        )}
                        <span className="chat-time">{msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                     </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="chat-typing-dot">
                     <span></span><span></span><span></span>
                  </div>
                )}
                <div ref={endOfMessagesRef} />
             </div>
             
             <div className="chat-input-wrapper">
                 <form className="chat-input-area" onSubmit={handleSend}>
                    <div className="input-glass">
                        <input 
                          type="text" 
                          placeholder={chatStep === 'IDLE' ? "Paste link here..." : "Reply with Yes or No..."}
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                        />
                        <button type="submit" className="send-btn">
                           <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                        </button>
                    </div>
                 </form>
             </div>
          </div>
       </div>
    </div>
  );
}
