import { useEffect, useState } from 'react';
import axios from 'axios';

export default function FactCard() {
  const [fact, setFact] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFact = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
      setFact(res.data.text);
    } catch (err) {
      setFact('Movies are better when shared with friends.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFact();
  }, []);

  return (
    <div className="fact-card glass-card animate-scale" style={{ 
      padding: '30px', 
      marginBottom: '40px',
      background: 'linear-gradient(135deg, rgba(94, 129, 172, 0.1) 0%, rgba(180, 142, 173, 0.05) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '-20px', 
        right: '-20px', 
        fontSize: '100px', 
        opacity: 0.03, 
        transform: 'rotate(-15deg)',
        pointerEvents: 'none'
      }}>🎬</div>
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ 
          display: 'flex', 
          justify-content: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ 
            fontSize: '13px', 
            textTransform: 'uppercase', 
            letterSpacing: '2px', 
            color: 'var(--accent)',
            fontWeight: '700'
          }}>Daily Cinematic Trivia</h3>
          <button 
            onClick={fetchFact} 
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
        
        <p style={{ 
          fontSize: '18px', 
          lineHeight: '1.6', 
          color: 'white',
          fontWeight: '500',
          fontStyle: 'italic'
        }}>
          "{loading ? 'Discovering a strange fact...' : fact}"
        </p>
      </div>
    </div>
  );
}
