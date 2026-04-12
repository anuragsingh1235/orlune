import React, { useState, useEffect, useRef } from 'react';
import './Features.css';

export default function Features() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Yo! Orlune Downloader at your service. 🛸 Paste any link and I\'ll grab it for you.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatStep, setChatStep] = useState('IDLE');
  const [activeLink, setActiveLink] = useState('');
  const [videoData, setVideoData] = useState(null);

  const endOfMessagesRef = useRef(null);
  const scrollToBottom = () => endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const extractYTId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\??v?=?))([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const fetchQuickInfo = async (url) => {
    const id = extractYTId(url);
    if (!id) return { title: 'Unknown Media', thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop' };
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      const data = await res.json();
      return { id, title: data.title, thumbnail: data.thumbnail_url };
    } catch { return { id, title: 'YouTube Media', thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg` }; }
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

    setTimeout(async () => {
      if (chatStep === 'IDLE') {
        const info = await fetchQuickInfo(userInput);
        setVideoData(info);
        setActiveLink(userInput);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Got it! Is this "${info.title}" what you want? (Yes/No)`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'confirmation',
          thumbnail: info.thumbnail
        }]);
        setChatStep('CONFIRM');
      } else if (chatStep === 'CONFIRM') {
        if (userInput.toLowerCase().includes('yes') || userInput.toLowerCase() === 'y') {
          setMessages(prev => [...prev, {
              id: Date.now() + 1,
              sender: 'bot',
              text: 'Sweet! One last thing, choose your quality flavor:',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: 'options',
              options: ['High Definition (1080p)', 'Standard (720p)', 'Audio only (MP3)']
          }]);
          setChatStep('CHOOSE');
        } else {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: 'Oops! Send the link again.', type: 'text' }]);
          setChatStep('IDLE');
        }
      }
      setIsTyping(false);
    }, 1000);
  };

  const handleOptionSelect = (option) => {
    setIsTyping(true);
    // Use sfrom.net which is famous for one-click downloading from YouTube
    const downloadUrl = `https://sfrom.net/${activeLink}`;
    
    setTimeout(() => {
        setMessages(prev => [...prev, {
            id: Date.now(),
            sender: 'bot',
            text: 'Boom! Your download is cooked and ready for collection.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'success',
            downloadUrl: downloadUrl
        }]);
        setIsTyping(false);
        setChatStep('IDLE');
    }, 1500);
  };

  return (
    <div className="features-page fade-in">
       <div className="features-header">
           <div className="status-dot-wrap"><span className="status-dot"></span> LIVE ENGINE</div>
           <h1 className="cyber-title">Downloader</h1>
           <p className="cyber-subtitle">Real-time chat extraction. Simple, fun, and fast. 🛸</p>
       </div>
       
       <div className="real-chat-box">
          <div className="chat-header-bar">
             <div className="avatar-group">
                <div className="bot-avatar-inner">🤖</div>
                <div className="avatar-info">
                   <span className="avatar-name">Orlune Bot</span>
                   <span className="avatar-status">Online</span>
                </div>
             </div>
          </div>
          
          <div className="chat-body scroll-hide">
              {messages.map(msg => (
                  <div key={msg.id} className={`msg-row ${msg.sender}`}>
                      {msg.sender === 'bot' && <div className="msg-avatar">O</div>}
                      <div className={`msg-bubble ${msg.type}`}>
                          {msg.text && <p>{msg.text}</p>}
                          {msg.type === 'confirmation' && (
                              <div className="thumb-confirm">
                                  <img src={msg.thumbnail} alt="Media" />
                              </div>
                          )}
                          {msg.type === 'options' && (
                              <div className="chat-res-grid">
                                  {msg.options.map((opt, i) => (
                                      <button key={i} className="chat-res-btn" onClick={() => handleOptionSelect(opt)}>{opt}</button>
                                  ))}
                              </div>
                          )}
                          {msg.type === 'success' && (
                              <div className="chat-success-wrap">
                                  <a href={msg.downloadUrl} target="_blank" rel="noopener noreferrer" className="chat-grab-btn">
                                      GRAB NOW
                                  </a>
                                  <span className="chat-meta">Direct tunnel to official file.</span>
                              </div>
                          )}
                          <span className="msg-time">{msg.time}</span>
                      </div>
                  </div>
              ))}
              {isTyping && <div className="typing-indicator"><span></span><span></span><span></span></div>}
              <div ref={endOfMessagesRef} />
          </div>

          <form className="chat-footer-input" onSubmit={handleSend}>
              <input 
                type="text" 
                placeholder={chatStep === 'IDLE' ? "Type or paste link..." : "Yes/No or pick option..."}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
              />
              <button type="submit" className="send-circle">
                 <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
              </button>
          </form>
       </div>
    </div>
  );
}
