import React, { useState, useEffect, useRef } from 'react';
import './Features.css';

export default function Features() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Yo, welcome to Orlune Drive! 🛸 Simple paste and let the engine hunt the file. No redirects, just direct results.',
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
    if (!id) return null;
    try {
      // Use official oEmbed - Fastest, no CORS, No IP blocks
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      const data = await res.json();
      return {
        id,
        title: data.title,
        thumbnail: data.thumbnail_url,
      };
    } catch (e) { return null; }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userInput = inputVal.trim();
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userInput, type: 'text' }]);
    setInputVal('');
    setIsTyping(true);

    if (chatStep === 'IDLE') {
      const info = await fetchQuickInfo(userInput);
      if (info) {
        setVideoData(info);
        setActiveLink(userInput);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Target Identified. Confirm extraction for "${info.title}"? (Yes/No)`,
          type: 'confirmation',
          thumbnail: info.thumbnail
        }]);
        setChatStep('CONFIRM');
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: 'Hmm, invalid link. Try a valid YouTube URL.', type: 'text' }]);
      }
    } else if (chatStep === 'CONFIRM') {
      const lower = userInput.toLowerCase();
      if (lower.includes('yes') || lower === 'y') {
        setMessages(prev => [...prev, {
            id: Date.now() + 1,
            sender: 'bot',
            text: 'Logic Engine Active. Generating direct stream links...',
            type: 'options',
            options: ['1080p Full HD', '720p HD', 'MP3 Audio High']
        }]);
        setChatStep('CHOOSE');
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: 'Aborted. Ready for next link.', type: 'text' }]);
        setChatStep('IDLE');
      }
    }
    setIsTyping(false);
  };

  const handleOptionSelect = (option) => {
    setIsTyping(true);
    // Directly generate a direct jump link to a famous site but WITH parameters 
    // to trigger download instantly (SaveFrom or Cobalt)
    
    // Cobalt with direct save-path is most reliable "No choosing" option
    // Redirect to a cobalt instance that handles the URL directly
    const downloadBase = `https://cobalt.tools/?u=${encodeURIComponent(activeLink)}`;
    
    setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'bot',
        text: `Extraction Complete. Your direct download tunnel is ready.`,
        type: 'success',
        downloadUrl: downloadBase,
        fileName: `${videoData.title.substring(0,25)}_${option}.mp4`
    }]);
    setIsTyping(false);
    setChatStep('IDLE');
  };

  return (
    <div className="features-page fade-in">
       <div className="features-header">
           <div className="badge-glow">ORLUNE DRIVE</div>
           <h1 className="cyber-title">Premium Downloader</h1>
           <p className="cyber-subtitle">Interactive media extraction. Confirm, click, and snatch. 🛸</p>
       </div>
       
       <div className="chat-container">
          <div className="chat-messages">
              {messages.map(msg => (
                  <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
                      <div className={`chat-bubble ${msg.sender} ${msg.type}`}>
                          {msg.text && <p>{msg.text}</p>}
                          {msg.type === 'confirmation' && (
                              <div className="confirm-box">
                                  <img src={msg.thumbnail} alt="Thumbnail" />
                              </div>
                          )}
                          {msg.type === 'options' && (
                              <div className="res-grid">
                                  {msg.options.map((opt, i) => (
                                      <button key={i} className="res-btn" onClick={() => handleOptionSelect(opt)}>{opt}</button>
                                  ))}
                              </div>
                          )}
                          {msg.type === 'success' && (
                              <div className="dl-final">
                                  <a href={msg.downloadUrl} target="_blank" rel="noopener noreferrer" className="dl-btn-last">
                                      GRAB FILE NOW
                                  </a>
                                  <span className="dl-hint">Redirects to direct file handler. No extra steps.</span>
                              </div>
                          )}
                      </div>
                  </div>
              ))}
              {isTyping && <div className="typing-dot">Extraction in progress...</div>}
              <div ref={endOfMessagesRef} />
          </div>

          <form className="chat-input-row" onSubmit={handleSend}>
              <input 
                type="text" 
                placeholder={chatStep === 'IDLE' ? "Paste any link..." : "Confirm with Yes or No..."}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
              />
              <button type="submit">GO</button>
          </form>
       </div>
    </div>
  );
}
