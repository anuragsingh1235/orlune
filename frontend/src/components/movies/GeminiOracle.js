import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import './GeminiOracle.css';

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
      const { data } = await api.post('/ai/oracle', { prompt: userMsg });
      setMessages(prev => [...prev, { role: 'model', content: data.response }]);
    } catch (error) {
      console.error("Oracle fetch failed:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Our records are currently locked by the cinematic authorities." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`gemini-oracle-container ${isOpen ? 'open' : 'closed'}`}>
      {/* 🚀 FLOAT BOT ICON */}
      <div className="oracle-trigger glass-card" onClick={() => setIsOpen(!isOpen)}>
        <div className="oracle-orb">
          <div className="orb-inner" />
          <div className="orb-glow" />
        </div>
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
