import { useState, useEffect, useRef } from 'react';
import './GeminiOracle.css';

const GEMINI_API_KEY = "AlzaSyC6iBa08j6iMrpY6bt9PvBsaRtJJy1bt8Q";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export default function GeminiOracle() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', content: "I am the Orlune Oracle. Seek my wisdom on any cinematic masterpiece or hidden gem." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `You are the Orlune Oracle, a high-end cinematic AI. You help users find movies, discuss theories, and appreciate film history. Be professional, slightly mystical, and deeply knowledgeable. User says: ${userMsg}` }]
          }]
        })
      });

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "The stars are clouded. Ask again, cinephile.";
      
      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (error) {
      console.error("Oracle fetch failed:", error);
      setMessages(prev => [...prev, { role: 'model', content: "My connection to the cinematic weave is weak right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`gemini-oracle-container ${isOpen ? 'open' : 'closed'}`}>
      {/* 🚀 FLOAT BOT ICON */}
      <div className="oracle-trigger glass-card" onClick={() => setIsOpen(!isOpen)}>
        <lottie-player 
          src="https://assets1.lottiefiles.com/packages/lf20_9aa8vbs6.json"
          background="transparent" speed="1" 
          style={{ width: '60px', height: '60px' }} 
          loop autoplay>
        </lottie-player>
        {!isOpen && <span className="oracle-badge">CINEMATIC ORACLE</span>}
      </div>

      {/* 🔮 CHAT WINDOW */}
      {isOpen && (
        <div className="oracle-window glass-card animate-scale">
          <div className="oracle-header">
            <div className="oracle-title">
              <span className="oracle-dot" />
              ORLUNE ORACLE
            </div>
            <button className="oracle-close" onClick={() => setIsOpen(false)}>&times;</button>
          </div>

          <div className="oracle-chat-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role}`}>
                <div className="msg-bubble">
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="msg-row model typing">
                <div className="msg-bubble">Oracle is consulting the archives...</div>
              </div>
            )}
          </div>

          <div className="oracle-input-area">
            <input 
              type="text" 
              placeholder="Seek cinematic wisdom..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={!input.trim() || isTyping}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
