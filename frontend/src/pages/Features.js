import React, { useState, useEffect, useRef } from 'react';
import './Features.css';

export default function Features() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Yo, welcome to Orlune Drive! 🛸 Drop a link (Insta, YouTube, Twitter, anywhere really) and I\'ll fetch it for you.',
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

  const allFormats = [
    '8K (4320p) MP4', '4K (2160p) MP4', '2K (1440p) MP4', 
    '1080p60 HD MP4', '1080p HD MP4', '720p60 HD MP4', '720p HD MP4', 
    '480p MP4', '360p MP4', '240p MP4', '144p MP4',
    '1080p WebM', '720p WebM', '480p WebM',
    'MP3 (320kbps)', 'MP3 (256kbps)', 'MP3 (128kbps)', 'M4A (High)', 'WAV (Lossless)', 'FLAC (Lossless)', 'OGG',
    'JPG (Max Quality)', 'PNG (Lossless)', 'WEBP (Optimized)', 'GIF (Animated)'
  ];

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
        text: 'Target acquired! 🎯 Choose your format. Don\'t be shy, we got them all:',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'options',
        options: allFormats
      };
      setMessages(prev => [...prev, botOptionsMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleOptionSelect = (optionName) => {
    const userChoiceMsg = {
      id: Date.now(),
      sender: 'user',
      text: `I want ${optionName}, please!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };
    setMessages(prev => [...prev, userChoiceMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const isImage = optionName.includes('JPG') || optionName.includes('PNG') || optionName.includes('WEBP') || optionName.includes('GIF');
      const isAudio = optionName.includes('MP3') || optionName.includes('WAV') || optionName.includes('FLAC') || optionName.includes('OGG') || optionName.includes('M4A');
      
      let thumb = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop'; // Default abstract video thumbnail
      if (isAudio) thumb = 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?q=80&w=300&auto=format&fit=crop'; // Audio thumbnail
      if (isImage) thumb = 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=300&auto=format&fit=crop'; // Image thumbnail

      const extension = isImage ? optionName.split(' ')[0].toLowerCase() : (isAudio ? optionName.split(' ')[0].toLowerCase() : 'mp4');

      const botResponse = {
        id: Date.now() + 1,
        sender: 'bot',
        text: `Boom! Done. Your file is baked and ready. 🍿`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'success',
        fileName: `Orlune_Drive_Download.${extension}`,
        thumbnail: thumb
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 2000);
  };

  const handleDownloadClick = (fileName) => {
    // Generate a dummy blob to simulate actual file download in browser
    const blob = new Blob([`Thanks for using Orlune Drive! This is a dummy downloaded file for [${fileName}]. Backend integration coming soon!`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="features-page fade-in">
       <div className="features-header">
           <div className="badge-glow">ORLUNE DRIVE</div>
           <h1 className="cyber-title">Universal Downloader</h1>
           <p className="cyber-subtitle">Paste a link and snatch the file. No sketchy ads, just raw downloading power. 🥷✨</p>
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
                        
                        {msg.type === 'options' && (
                          <div className="options-box">
                             <p className="options-text">{msg.text}</p>
                             <div className="resolution-grid">
                               {msg.options.map((opt, i) => {
                                 const isAudio = opt.includes('MP3') || opt.includes('WAV') || opt.includes('FLAC') || opt.includes('OGG') || opt.includes('M4A');
                                 const isImage = opt.includes('JPG') || opt.includes('PNG') || opt.includes('WEBP') || opt.includes('GIF');
                                 
                                 return (
                                   <button key={i} className="res-btn" onClick={() => handleOptionSelect(opt)}>
                                     <div className="res-icon-wrap">
                                        {isAudio ? 
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg> :
                                         isImage ?
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> :
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                                        }
                                     </div>
                                     <span>{opt}</span>
                                   </button>
                                 )
                               })}
                             </div>
                          </div>
                        )}

                        {msg.type === 'success' && (
                          <div className="success-dl-box">
                             <p>{msg.text}</p>
                             <div className="dl-card">
                                 <div className="dl-thumb">
                                     <img src={msg.thumbnail} alt="Thumbnail preview" />
                                 </div>
                                 <div className="dl-info">
                                     <span className="dl-name">{msg.fileName}</span>
                                     <span className="dl-meta">100% Ready • Click to grab</span>
                                 </div>
                                 <button className="dl-action-btn" onClick={() => handleDownloadClick(msg.fileName)}>Grab File</button>
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
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
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
