import React, { useState, useEffect, useRef } from 'react';
import './Features.css';

export default function Features() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Yo, welcome to Orlune Drive! 🛸 Drop a link (YouTube, Instagram, etc.) and I\'ll fire up the FFMPEG core for you.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Flow control
  const [chatStep, setChatStep] = useState('IDLE'); // IDLE, CONFIRM_MEDIA, CHOOSE_RES, PROCESSING, SUCCESS
  const [activeLink, setActiveLink] = useState('');
  const [videoData, setVideoData] = useState(null);

  const endOfMessagesRef = useRef(null);
  const scrollToBottom = () => endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const extractYTId = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
      if (u.hostname.includes('youtu.be')) return u.pathname.split('/').pop();
    } catch {}
    return null;
  };

  const fetchVideoInfo = async (url) => {
    const id = extractYTId(url);
    if (!id) return null;

    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${API_URL}/api/download/info?id=${id}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.error("Extraction error", e);
    }
    return null;
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
      const data = await fetchVideoInfo(userInput);
      if (data) {
        setVideoData(data);
        setActiveLink(userInput);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Target Found: "${data.title}". Use FFMPEG to extract this? (Yes/No)`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'confirmation',
          thumbnail: data.thumbnail
        }]);
        setChatStep('CONFIRM_MEDIA');
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Hmm, I couldn\'t grab that link. Make sure it\'s a valid YouTube link!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        }]);
      }
    } else if (chatStep === 'CONFIRM_MEDIA') {
       if (userInput.toLowerCase().includes('yes') || userInput.toLowerCase() === 'y') {
         setMessages(prev => [...prev, {
           id: Date.now() + 1,
           sender: 'bot',
           text: 'FFMPEG Engine Ready. Select your precision format:',
           time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           type: 'options',
           options: videoData.options.map(opt => opt.label)
         }]);
         setChatStep('CHOOSE_RES');
       } else {
         setMessages(prev => [...prev, {
           id: Date.now() + 1,
           sender: 'bot',
           text: 'Copy that. Mission aborted. Drop another link whenever.',
           time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           type: 'text'
         }]);
         setChatStep('IDLE');
       }
    }
    setIsTyping(false);
  };

  const handleOptionSelect = (label) => {
    const selection = videoData.options.find(o => o.label === label);
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text: `Gimme the ${label}!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    }]);
    
    setIsTyping(true);
    setChatStep('PROCESSING');

    // Simulate "Cool FFMPEG Processing" in browser
    const steps = [
      'Initalizing FFmpeg.wasm Core...',
      'Allocating Memory Buffers...',
      'Fetching Raw Stream Packets...',
      'Bypassing Vercel Lambda Limits...',
      'Finalizing Multiplex Output...'
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last.type === 'ffmpeg_status') {
             return [...prev.slice(0, -1), { ...last, text: steps[stepIdx] }];
          }
          return [...prev, { id: Date.now() + stepIdx, sender: 'bot', text: steps[stepIdx], type: 'ffmpeg_status' }];
        });
        stepIdx++;
      } else {
        clearInterval(interval);
        setMessages(prev => [...prev, {
          id: Date.now() + 99,
          sender: 'bot',
          text: 'FFMPEG processing complete! Direct file stream is ready.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'success',
          downloadUrl: selection.url,
          fileName: `${videoData.title.substring(0, 20)}_${selection.quality}.mp4`
        }]);
        setIsTyping(false);
        setChatStep('IDLE');
      }
    }, 1000);
  };

  return (
    <div className="features-page fade-in">
       <div className="features-header">
           <div className="badge-glow">ORLUNE DRIVE + FFMPEG</div>
           <h1 className="cyber-title">Universal Downloader</h1>
           <p className="cyber-subtitle">Pro extraction with zero redirects. Simple, powerful, and clean. 📽️⚙️</p>
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
                        {msg.type === 'ffmpeg_status' && (
                          <div className="ffmpeg-proc">
                            <span className="proc-dot"></span>
                            <span className="proc-text">{msg.text}</span>
                          </div>
                        )}
                        
                        {msg.type === 'confirmation' && (
                           <div className="options-box">
                             <p className="options-text">{msg.text}</p>
                             <div className="confirm-thumb">
                               <img src={msg.thumbnail} alt="Extracted Thumbnail" referrerPolicy="no-referrer" />
                             </div>
                           </div>
                        )}

                        {msg.type === 'options' && (
                          <div className="options-box">
                             <p className="options-text">{msg.text}</p>
                             <div className="resolution-grid">
                               {msg.options.map((opt, i) => (
                                 <button key={i} className="res-btn" onClick={() => handleOptionSelect(opt)}>
                                   <div className="res-icon-wrap">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>
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
                                 <div className="dl-icon-large">
                                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                 </div>
                                 <div className="dl-info">
                                     <span className="dl-name">{msg.fileName}</span>
                                     <span className="dl-meta">100% Native Link Generated</span>
                                 </div>
                                 <a href={msg.downloadUrl} className="dl-action-btn" download={msg.fileName} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                     Grab File
                                 </a>
                             </div>
                          </div>
                        )}
                        <span className="chat-time">{msg.time}</span>
                     </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="chat-bubble-wrapper bot">
                     <div className="bot-avatar"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg></div>
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
                          placeholder={chatStep === 'IDLE' ? "Paste URL here..." : "Type Yes/No or select format..."} 
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                          disabled={chatStep === 'CHOOSE_RES' || chatStep === 'PROCESSING'}
                        />
                        <button type="submit" className="send-btn" disabled={!inputVal.trim() || chatStep === 'CHOOSE_RES' || chatStep === 'PROCESSING'}>
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
