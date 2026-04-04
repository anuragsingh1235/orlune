import { useState, useEffect } from 'react';
import './MasteryQuestionModal.css';

const QUESTS = [
  "What was the emotional peak of this cinematic journey for you?",
  "How did the visual storytelling influence your perception of the plot?",
  "Which character arc felt the most refined and why?",
  "If you could alter one turning point in this story, which would it be?",
  "What is the ultimate message you take away from this masterpiece?",
  "How does this title compare to the pinnacle of its genre?",
  "Which scene left the most indelible mark on your memory?"
];

export default function MasteryQuestionModal({ item, onComplete, onClose }) {
  const [step, setStep] = useState('quiz'); // 'quiz', 'review', 'score'
  const [questionData, setQuestionData] = useState({ q: "", a: true });
  const [userAnswer, setUserAnswer] = useState(null);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(8);
  const [philosophicalQ, setPhilosophicalQ] = useState("");

  useEffect(() => {
    // Generate a more sophisticated "Master's Challenge"
    const overview = item.overview || "";
    const releaseYear = item.release_date ? new Date(item.release_date).getFullYear() : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'the past');
    
    const quizTypes = [
      {
        q: `True or False: "${item.title}" was originally unveiled to the world around ${releaseYear}?`,
        a: true
      },
      {
        q: `True or False: The narrative of this masterpiece is primarily set in a cyberpunk future?`,
        a: overview.toLowerCase().includes('cyber') || overview.toLowerCase().includes('future')
      },
      {
        q: `True or False: A pivotal theme in this story involves complex human relationships or personal growth?`,
        a: true // Almost always true for good movies
      },
      {
        q: `True or False: This title's historical archive suggests it belongs to the "Action" genre?`,
        a: item.genre_ids?.includes(28) || false
      }
    ];

    const randomQuiz = quizTypes[Math.floor(Math.random() * quizTypes.length)];
    setQuestionData(randomQuiz);
    setPhilosophicalQ(QUESTS[Math.floor(Math.random() * QUESTS.length)]);
  }, [item]);

  const handleNext = () => {
    if (step === 'quiz') setStep('review');
    else if (step === 'review') setStep('score');
  };

  const handleSubmit = () => {
    onComplete({
      heritage_score: rating,
      user_review: review || "A silent testament to cinematic brilliance.",
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
                    <div className="step-lottie">
                      <lottie-player 
                        src="https://assets10.lottiefiles.com/packages/lf20_9aa8vbs6.json"
                        background="transparent" speed="1" 
                        style={{ width: '120px', height: '120px', margin: '0 auto' }} 
                        loop autoplay>
                      </lottie-player>
                    </div>
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
                            {userAnswer === questionData.a 
                              ? "✨ EXCELLENT. Your knowledge of the archive is impeccable." 
                              : "❌ A MOMENTARY LAPSE. But a master learns from every shadow."}
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
                    <div className="step-lottie">
                      <lottie-player 
                        src="https://assets8.lottiefiles.com/packages/lf20_0m6re7at.json"
                        background="transparent" speed="1" 
                        style={{ width: '120px', height: '120px', margin: '0 auto' }} 
                        loop autoplay>
                      </lottie-player>
                    </div>
                    <label className="mq-label">{philosophicalQ} <span style={{fontSize: '11px', color: 'rgba(255,255,255,0.3)'}}>(Optional)</span></label>
                    <textarea 
                        className="mq-textarea"
                        placeholder="Your perspective shapes the legacy of this work..."
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
                    <div className="step-lottie">
                      <lottie-player 
                        src="https://assets7.lottiefiles.com/private_files/lf30_wwu0w7hi.json"
                        background="transparent" speed="1" 
                        style={{ width: '120px', height: '120px', margin: '0 auto' }} 
                        loop autoplay>
                      </lottie-player>
                    </div>
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
