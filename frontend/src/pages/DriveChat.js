import React, { useState, useEffect, useRef } from 'react';
import './Features.css';

export default function DriveChat() {
  const [messages, setMessages] = useState([
    {
      id: 1, sender: 'bot',
      text: 'Welcome to Orlune Drive. Provide a valid media link to initiate the extraction.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatStep, setChatStep] = useState('IDLE');
  const [activeLink, setActiveLink] = useState('');

  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const extractYTId = (url) => {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
    return m ? m[1] : null;
  };

  const pushBot = (msg) => setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', ...msg }]);

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

    if (chatStep === 'IDLE') {
      setActiveLink(userInput);
      const id = extractYTId(userInput);
      const thumb = id
        ? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop';
      setTimeout(() => {
        pushBot({ text: 'Found it! Is this the right media? (Reply Yes or No)', type: 'confirmation', thumbnail: thumb });
        setChatStep('CONFIRM_MEDIA');
        setIsTyping(false);
      }, 800);
    } else if (chatStep === 'CONFIRM_MEDIA') {
      const lower = userInput.toLowerCase();
      if (lower.includes('yes') || lower === 'y') {
        setTimeout(() => {
          pushBot({ text: 'Choose your preferred format:', type: 'options', options: ['High Quality (1080p)', 'Standard (720p)', 'Audio Only (MP3)'] });
          setChatStep('CHOOSE_RES');
          setIsTyping(false);
        }, 800);
      } else {
        pushBot({ text: 'No problem. Drop the correct link and we will try again.' });
        setChatStep('IDLE');
        setIsTyping(false);
      }
    }
  };

  const handleOptionSelect = () => {
    setIsTyping(true);
    const videoId = extractYTId(activeLink);
    const isIG = activeLink.includes('instagram.com');
    const enc = encodeURIComponent(activeLink);
    try { navigator.clipboard.writeText(activeLink); } catch (_) {}

    const url1 = isIG ? `https://snapinsta.app/?url=${enc}` : `https://ssyoutube.com/en89/?url=${enc}`;
    const url2 = isIG ? `https://fastdl.app/en/?url=${enc}` : `https://yt5s.biz/en/youtube-to-mp4?q=${videoId}`;
    const url3 = isIG ? `https://sssinstagram.com/` : (videoId ? `https://www.youtubepp.com/watch?v=${videoId}` : `https://en.savefrom.net/373/`);

    setTimeout(() => {
      pushBot({
        text: 'Ready. Select a server to download. Your link was copied to clipboard.',
        type: 'success', downloadUrl: url1, downloadUrl2: url2, downloadUrl3: url3
      });
      setIsTyping(false);
      setChatStep('IDLE');
    }, 1200);
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
                {msg.type === 'confirmation' && (
                  <div className="options-box">
                    <p className="options-text">{msg.text}</p>
                    <div className="confirm-thumb"><img src={msg.thumbnail} alt="Preview" /></div>
                  </div>
                )}
                {msg.type === 'options' && (
                  <div className="options-box">
                    <p className="options-text">{msg.text}</p>
                    <div className="resolution-grid">
                      {msg.options.map((opt, i) => (
                        <button key={i} className="res-btn" onClick={() => handleOptionSelect(opt)}><span>{opt}</span></button>
                      ))}
                    </div>
                  </div>
                )}
                {msg.type === 'success' && (
                  <div className="success-dl-box">
                    <p>{msg.text}</p>
                    <div className="dl-card-grid">
                      <a href={msg.downloadUrl} target="_blank" rel="noopener noreferrer" className="dl-server-btn primary wave-btn">
                        <span className="sv-name">SERVER 1 (BEST CHOICE)</span><span className="sv-status">RECOMMENDED</span>
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
          {isTyping && <div className="chat-typing-dot"><span/><span/><span/></div>}
          <div ref={endRef} />
        </div>
        <div className="chat-input-wrapper">
          <form className="chat-input-area" onSubmit={handleSend}>
            <div className="input-glass">
              <input
                type="text"
                placeholder={chatStep === 'IDLE' ? 'Paste link here...' : 'Reply Yes or No...'}
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
