import { useState, useEffect } from 'react';
import './MasteryQuestionModal.css';

const QUESTS = [
  "What was the emotional peak of this cinematic journey for you?",
  "How did the visual storytelling influence your perception of the plot?",
  "Which character arc felt the most refined and why?",
  "If you could alter one turning point in this story, which would it be?",
  "What is the ultimate message you take away from this masterpiece?"
];

export default function MasteryQuestionModal({ item, onComplete, onClose }) {
  const [step, setStep] = useState('quiz'); // 'quiz', 'review', 'score'
  const [questionData, setQuestionData] = useState({ q: "", a: true });
  const [userAnswer, setUserAnswer] = useState(null);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(8);
  const [philosophicalQ, setPhilosophicalQ] = useState("");

  useEffect(() => {
    // Generate a simple "Fun Quiz" based on the overview if available
    const words = item.overview ? item.overview.split(' ').slice(0, 5).join(' ') : item.title;
    const isTrue = Math.random() > 0.5;
    const q = isTrue 
      ? `True or False: This title involves "${words}..."?`
      : `True or False: This story is primarily about a chef named "Gordon"?`;
    
    setQuestionData({ q, a: isTrue });
    setPhilosophicalQ(QUESTS[Math.floor(Math.random() * QUESTS.length)]);
  }, [item]);

  const handleNext = () => {
    if (step === 'quiz') setStep('review');
    else if (step === 'review') setStep('score');
  };

  const handleSubmit = () => {
    onComplete({
      user_rating: rating,
      user_review: review || "No thoughts shared.",
      status: 'completed'
    });
  };

  return (
    <div className="mq-modal-overlay animate-fade" onClick={onClose}>
      <div className="mq-modal-content glass-card animate-scale" onClick={e => e.stopPropagation()}>
        <button className="mq-close" onClick={onClose}>&times;</button>
        
        <div className="mq-header">
            <span className="mq-badge">CINEMATIC MASTER'S QUEST</span>
            <h2 className="text-gradient">Mastering "{item.title}"</h2>
        </div>

        <div className="mq-body">
            {/* STEP 0: FUN QUIZ */}
            {step === 'quiz' && (
                <div className="mq-step animate-fade">
                    <label className="mq-label">🎥 MASTER'S CHALLENGE</label>
                    <p className="mq-quiz-text">{questionData.q}</p>
                    <div className="mq-quiz-options">
                        <button 
                            className={`mq-quiz-btn ${userAnswer === true ? 'selected' : ''}`}
                            onClick={() => setUserAnswer(true)}
                        >
                            TRUE
                        </button>
                        <button 
                            className={`mq-quiz-btn ${userAnswer === false ? 'selected' : ''}`}
                            onClick={() => setUserAnswer(false)}
                        >
                            FALSE
                        </button>
                    </div>
                    {userAnswer !== null && (
                        <div className={`mq-quiz-feedback ${userAnswer === questionData.a ? 'correct' : 'incorrect'}`}>
                            {userAnswer === questionData.a ? "✨ IMPRESSIVE. YOU WERE PAYING ATTENTION." : "❌ INCORRECT, BUT YOUR LEGACY CONTINUES."}
                        </div>
                    )}
                    <button className="mq-next-btn" disabled={userAnswer === null} onClick={handleNext}>
                        Proceed to Archive Thoughts
                    </button>
                </div>
            )}

            {/* STEP 1: PHILOSOPHICAL REVIEW */}
            {step === 'review' && (
                <div className="mq-step animate-fade">
                    <label className="mq-label">{philosophicalQ} <span style={{fontSize: '11px', color: '#666'}}>(Optional)</span></label>
                    <textarea 
                        className="mq-textarea"
                        placeholder="Share your thoughts... or leave blank to continue."
                        value={review}
                        onChange={e => setReview(e.target.value)}
                        rows={4}
                    />
                    <button className="mq-next-btn" onClick={handleNext}>
                        Continue to Heritage Score
                    </button>
                </div>
            )}

            {/* STEP 2: SCORE */}
            {step === 'score' && (
                <div className="mq-step animate-fade">
                    <label className="mq-label">Define its Heritage Score <span style={{fontSize: '11px', color: '#B48EAD'}}>(REQUIRED)</span></label>
                    <div className="mq-rating-selector">
                        <input 
                            type="range" min="1" max="10" step="0.1"
                            value={rating} 
                            onChange={e => setRating(parseFloat(e.target.value))}
                            className="mq-range"
                        />
                        <div className="mq-rating-display">
                            <span className="mq-rating-val">{rating.toFixed(1)}</span>
                            <span className="mq-rating-max">/ 10</span>
                        </div>
                    </div>
                    <button className="mq-finish-btn" onClick={handleSubmit}>
                        Master & Archive Record
                    </button>
                    <button className="mq-back-link" onClick={() => setStep('review')}>
                        ← Back to Thoughts
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
