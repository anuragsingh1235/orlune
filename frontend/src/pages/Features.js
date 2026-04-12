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
  
  // State for flow control
  const [chatStep, setChatStep] = useState('IDLE'); // IDLE, CONFIRM_MEDIA, CHOOSE_RES
  const [activeLink, setActiveLink] = useState('');

  const endOfMessagesRef = useRef(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const extractThumbnail = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = urlObj.searchParams.get('v');
        if (!videoId) {
           videoId = urlObj.pathname.split('/').pop();
        }
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
      if (urlObj.hostname.includes('instagram.com')) {
         return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=300&auto=format&fit=crop';
      }
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop';
    } catch {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop';
    }
  };

  const getFeasibleOptions = (url) => {
     try {
        const u = new URL(url);
        // If it's a video site, provide standard resolutions we can reliably redirect
        if (u.hostname.includes('youtube') || u.hostname.includes('youtu.be')) {
           return ['1080p Video (MP4)', '720p Video (MP4)', 'MP3 Audio (High)', 'MP3 Audio (Standard)'];
        }
        if (u.hostname.includes('instagram')) {
           return ['HD Video/Reel (MP4)', 'High Res Image (JPG)'];
        }
     } catch {}
     return ['High Quality (MP4/JPG)', 'Audio Only (MP3)'];
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userInput = inputVal.trim();
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: userInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      if (chatStep === 'IDLE') {
        const thumb = extractThumbnail(userInput);
        setActiveLink(userInput);
        
        const botConfirmMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: 'Found it! Is this the right media? (Reply "Yes" or "No")',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'confirmation',
          thumbnail: thumb
        };
        setMessages(prev => [...prev, botConfirmMsg]);
        setChatStep('CONFIRM_MEDIA');
        setIsTyping(false);
      } 
      else if (chatStep === 'CONFIRM_MEDIA') {
        const textLower = userInput.toLowerCase();
        if (textLower.includes('yes') || textLower.includes('yup') || textLower.includes('yeah') || textLower.includes('y')) {
          const optionsMsg = {
            id: Date.now() + 1,
            sender: 'bot',
            text: 'Sweet! Choose your preferred format:',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'options',
            options: getFeasibleOptions(activeLink)
          };
          setMessages(prev => [...prev, optionsMsg]);
          setChatStep('CHOOSE_RES');
        } else {
          const resetMsg = {
            id: Date.now() + 1,
            sender: 'bot',
            text: 'Oops, my bad. Please drop the correct link!',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text'
          };
          setMessages(prev => [...prev, resetMsg]);
          setChatStep('IDLE');
          setActiveLink('');
        }
        setIsTyping(false);
      }
      else {
         // If user types while choosing res, just ignore or reset
         setIsTyping(false);
      }
    }, 1500);
  };

  const handleOptionSelect = (optionName) => {
    if (chatStep !== 'CHOOSE_RES') return;

    const userChoiceMsg = {
      id: Date.now(),
      sender: 'user',
      text: `I want ${optionName}, please!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };
    setMessages(prev => [...prev, userChoiceMsg]);
    setTimeout(async () => {
      try {
        const isAudio = optionName.includes('MP3');
        const vQualityStr = optionName.includes('1080p') ? '1080' : optionName.includes('720p') ? '720' : 'max';

        const res = await fetch('https://api.cobalt.tools/api/json', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: activeLink,
            vQuality: vQualityStr,
            isAudioOnly: isAudio,
            filenamePattern: 'classic'
          })
        });

        if (!res.ok) throw new Error('Failed to grab via API');
        const data = await res.json();
        
        if (data.status === 'error') throw new Error(data.text);
        
        const finalUrl = data.url; // This is the direct streaming mp4/mp3 url

        const botResponse = {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Success! The raw file is ready for direct download. 🍿`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'success',
          downloadUrl: finalUrl,
          fileName: `Nexus_Direct_Download`
        };
        setMessages(prev => [...prev, botResponse]);
      } catch (err) {
        console.error("Extraction error", err);
        const errResponse = {
          id: Date.now() + 1,
          sender: 'bot',
          text: `Oops, the extraction API is busy or blocked this link. Try another one!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        };
        setMessages(prev => [...prev, errResponse]);
      }

      setIsTyping(false);
      
      setTimeout(() => {
          setChatStep('IDLE');
          setActiveLink('');
      }, 1500);
    }, 1500);
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
                        
                        {msg.type === 'confirmation' && (
                           <div className="options-box">
                             <p className="options-text">{msg.text}</p>
                             <div className="confirm-thumb">
                               <img src={msg.thumbnail} alt="Extracted Thumbnail" />
                             </div>
                           </div>
                        )}

                        {msg.type === 'options' && (
                          <div className="options-box">
                             <p className="options-text">{msg.text}</p>
                             <div className="resolution-grid">
                               {msg.options.map((opt, i) => {
                                 const isAudio = opt.includes('MP3');
                                 const isImage = opt.includes('JPG');
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
                                 <div className="dl-icon-large">
                                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                 </div>
                                 <div className="dl-info">
                                     <span className="dl-name">{msg.fileName}</span>
                                     <span className="dl-meta">Redirecting to raw file...</span>
                                 </div>
                                 <a href={msg.downloadUrl} target="_blank" rel="noopener noreferrer" className="dl-action-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                          placeholder={chatStep === 'IDLE' ? "Paste URL here..." : chatStep === 'CONFIRM_MEDIA' ? "Type Yes or No..." : "Choose an option above!"} 
                          value={inputVal}
                          onChange={(e) => setInputVal(e.target.value)}
                          disabled={chatStep === 'CHOOSE_RES'}
                        />
                        <button type="submit" className="send-btn" disabled={!inputVal.trim() || chatStep === 'CHOOSE_RES'}>
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
