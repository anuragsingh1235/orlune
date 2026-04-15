import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Trivia.css';

// Using the Java service URL directly for this demo, or fallback to the Node API.
// Assuming Java runs on 8080 locally. In production, we fallback to the Node.js implementation.
const API_BASE = process.env.NODE_ENV === 'production' ? '/api/trivia' : 'http://localhost:8080/trivia'; 

export default function Trivia() {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [session, setSession] = useState(null); // { sessionId, questions, maxScore, timePerQuestion }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [time, setTime] = useState(30);
  const [loading, setLoading] = useState(false);
  const [scoreData, setScoreData] = useState({ score: 0, streak: 0, bestStreak: 0 });
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  // Load categories (optional check to see if Java is up)
  useEffect(() => {
    axios.get(`${API_BASE}/categories`)
      .then(r => setCategories([
        { id: 'all', label: '🌍 All Movies' },
        { id: 'hollywood', label: '🎥 Hollywood' },
        { id: 'bollywood', label: '💃 Bollywood' },
        { id: 'anime', label: '🌸 Anime' },
        { id: 'kdrama', label: '🇰🇷 K-Drama' }
      ]))
      .catch((err) => {
        console.warn("Could not connect to Java Backend, using hardcoded categories.");
        setCategories([
          { id: 'all', label: '🌍 All Movies' },
          { id: 'hollywood', label: '🎥 Hollywood' },
          { id: 'bollywood', label: '💃 Bollywood' },
          { id: 'anime', label: '🌸 Anime' },
          { id: 'kdrama', label: '🇰🇷 K-Drama' }
        ]);
      });
  }, []);

  // Timer logic
  useEffect(() => {
    if (!session || result) return;
    if (time <= 0) {
      handleAnswer('-1'); // Time out implies incorrect answer
      return;
    }
    const timer = setInterval(() => setTime(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [time, session, result]);

  const startQuiz = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/start`, { category: selectedCat, count: 10 });
      setSession(res.data);
      setCurrentIdx(0);
      setTime(res.data.timePerQuestion || 30);
      setScoreData({ score: 0, streak: 0, bestStreak: 0 });
      setResult(null);
    } catch (e) {
      alert("Failed to start quiz. Make sure the Java backend is running on port 8080.");
    }
    setLoading(false);
  };

  const handleAnswer = async (answerVal) => {
    if (result) return;
    const q = session.questions[currentIdx];
    try {
      const res = await axios.post(`${API_BASE}/answer`, {
        sessionId: session.sessionId,
        questionId: q.id,
        answer: answerVal
      });

      setScoreData({
        score: res.data.score,
        streak: res.data.streak,
        bestStreak: res.data.bestStreak
      });

      // Show temporary feedback here if desired (e.g. green flash)

      setTimeout(() => {
        if (currentIdx + 1 < session.questions.length) {
          setCurrentIdx(currentIdx + 1);
          setTime(session.timePerQuestion || 30);
        } else {
          finishQuiz();
        }
      }, 800); // short delay to see result
      
    } catch (e) {
      console.error(e);
    }
  };

  const finishQuiz = async () => {
    try {
      const res = await axios.get(`${API_BASE}/result/${session.sessionId}`);
      setResult(res.data);
      
      // Save result to the Node.js backend to update the leaderboard/profile (Cross-Service Integration)
      await axios.post('/api/trivia/save', { sessionId: session.sessionId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).catch(e => console.warn('Could not sync with Node backend for leaderboard.'));

    } catch (e) {
      console.error(e);
    }
  };

  if (result) {
    return (
      <div className="trivia-page animate-fade">
        <div className="trivia-result-card glass-card">
          <h1>🏆 Quiz Complete!</h1>
          <div className="trivia-grade" data-grade={result.grade}>{result.grade}</div>
          <h2>{result.score} / {result.maxScore} Pts</h2>
          <p>Accuracy: {result.percentage}% ({result.correct}/{result.total} Correct)</p>
          <p>Best Streak: {result.bestStreak} 🔥</p>
          <div className="trivia-result-actions">
            <button className="trivia-btn primary" onClick={() => setResult(null)}>Play Again</button>
            <button className="trivia-btn secondary" onClick={() => navigate('/leaderboard')}>Go to Leaderboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (session) {
    const q = session.questions[currentIdx];
    return (
      <div className="trivia-page animate-fade">
        <div className="trivia-header">
          <div className="trivia-stats">
            <span>Q: {currentIdx + 1}/{session.questions.length}</span>
            <span>Score: {scoreData.score}</span>
            <span style={{ color: scoreData.streak > 2 ? 'var(--accent-gold)' : 'inherit' }}>
              Streak: {scoreData.streak} {scoreData.streak > 2 && '🔥'}
            </span>
          </div>
          <div className="trivia-timer">
            <div className="time-bar" style={{ width: `${(time / (session.timePerQuestion || 30)) * 100}%`, backgroundColor: time < 10 ? 'var(--accent-danger)' : 'var(--accent)' }}></div>
            <span>{time}s</span>
          </div>
        </div>

        <div className="trivia-question-card glass-card">
          <span className="trivia-badge">{q.category.toUpperCase()} • {q.difficulty.toUpperCase()}</span>
          <h2 className="trivia-question-text">{q.text}</h2>

          <div className="trivia-options">
            {q.type === 'mcq' && q.options && q.options.map((opt, i) => (
              <button key={i} className="trivia-option-btn" onClick={() => handleAnswer(i.toString())}>
                {opt}
              </button>
            ))}
            {q.type === 'truefalse' && (
              <>
                <button className="trivia-option-btn" onClick={() => handleAnswer('true')}>True</button>
                <button className="trivia-option-btn" onClick={() => handleAnswer('false')}>False</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trivia-page animate-fade">
      <div className="trivia-lobby glass-card">
        <div className="trivia-lobby-glow"></div>
        <h1>🏅 Cinematic Certification</h1>
        <p>Prove your expertise to the community. Pass the rigorous cinematic assessment powered by our Java Spring Boot grading engine to earn your Verified badge.</p>

        <div className="trivia-config">
          <label>Select Subject Expertise</label>
          <div className="trivia-cat-grid">
            {categories.map(c => (
              <button 
                key={c.id} 
                className={`trivia-cat-btn ${selectedCat === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCat(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <button className="trivia-start-btn" onClick={startQuiz} disabled={loading}>
          {loading ? 'Initializing Engine...' : 'Begin Certification Exam'}
        </button>
      </div>
    </div>
  );
}
