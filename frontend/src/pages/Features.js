import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import './Features.css';

const Workshop = lazy(() => import('./Workshop'));


export default function Features() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Welcome to Orlune Drive. Please provide a valid media link to safely initiate the extraction process.',
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
    const isInstagram = activeLink.includes('instagram.com');
    const encodedUrl = encodeURIComponent(activeLink);
    
    // Attempt Auto-Copy to clipboard so the user can easily paste it on the next screen
    try { navigator.clipboard.writeText(activeLink); } catch (err) {}
    
    // Server Endpoints
    const yt1 = `https://ssyoutube.com/en89/?url=${encodedUrl}`;
    const yt2 = `https://yt5s.biz/en/youtube-to-mp4?q=${videoId}`;
    const yt3 = videoId ? `https://www.youtubepp.com/watch?v=${videoId}` : `https://en.savefrom.net/373/`;
    
    const ig1 = `https://snapinsta.app/?url=${encodedUrl}`;
    const ig2 = `https://fastdl.app/en/?url=${encodedUrl}`;
    const ig3 = `https://sssinstagram.com/`;

    const url1 = isInstagram ? ig1 : yt1;
    const url2 = isInstagram ? ig2 : yt2;
    const url3 = isInstagram ? ig3 : yt3;

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Ready! Click a server below. (Hint: Your link is auto-copied! Just PASTE it if the site asks.)',
        type: 'success',
        downloadUrl: url1,
        downloadUrl2: url2,
        downloadUrl3: url3,
        fileName: 'Media_Download'
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
           <p className="cyber-subtitle">Paste a link, confirm with Yes/No, and snatch the file.</p>
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
                             <div className="dl-card-grid">
                                 <a href={msg.downloadUrl} target="_blank" rel="noopener noreferrer" className="dl-server-btn primary wave-btn">
                                     <span className="sv-name">SERVER 1 (BEST CHOICE)</span>
                                     <span className="sv-status">RECOMMENDED</span>
                                 </a>
                                 <a href={msg.downloadUrl2} target="_blank" rel="noopener noreferrer" className="dl-server-btn wave-btn">
                                     <span className="sv-name">SERVER 2 (BACKUP)</span>
                                 </a>
                                 <a href={msg.downloadUrl3} target="_blank" rel="noopener noreferrer" className="dl-server-btn wave-btn">
                                     <span className="sv-name">SERVER 3 (FAILSAFE)</span>
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
                        <button type="submit" className="send-btn-cool">
                           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                             <line x1="22" y1="2" x2="11" y2="13"></line>
                             <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                           </svg>
                        </button>
                    </div>
                 </form>
             </div>
          </div>
       </div>
      <div className="features-divider">
        <div className="divider-line" />
        <span className="divider-label">MORE FEATURES</span>
        <div className="divider-line" />
      </div>

      <Suspense fallback={<div className="workshop-loading">Loading Workshop...</div>}>
        <Workshop />
      </Suspense>
    </div>
  );
}
