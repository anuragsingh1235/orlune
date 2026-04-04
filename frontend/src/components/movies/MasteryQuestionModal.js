import { useState, useEffect } from 'react';
import './MasteryQuestionModal.css';

const QUESTIONS = [
  "What was the emotional peak of this cinematic journey for you?",
  "How did the visual storytelling influence your perception of the plot?",
  "Which character arc felt the most refined and why?",
  "If you could alter one turning point in this story, which would it be?",
  "What is the ultimate message you take away from this masterpiece?",
  "How does this title rank among your historical favorites?",
  "Describe the cinematography's impact on the atmosphere in three words."
];

export default function MasteryQuestionModal({ item, onComplete, onClose }) {
  const [question, setQuestion] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(8);
  const [step, setStep] = useState(1);

  useEffect(() => {
    setQuestion(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]);
  }, []);

  const handleSubmit = () => {
    onComplete({
      user_rating: rating,
      user_review: review,
      status: 'completed'
    });
  };

  return (
    <div className="mq-modal-overlay animate-fade" onClick={onClose}>
      <div className="mq-modal-content glass-card animate-scale" onClick={e => e.stopPropagation()}>
        <button className="mq-close" onClick={onClose}>&times;</button>
        
        <div className="mq-header">
            <span className="mq-badge">CINEMATIC MASTERY</span>
            <h2 className="text-gradient">Mastering "{item.title}"</h2>
            <p className="mq-sub">Before archiving this journey, share your heritage.</p>
        </div>

        <div className="mq-body">
            {step === 1 ? (
                <div className="mq-step animate-fade">
                    <label className="mq-label">{question}</label>
                    <textarea 
                        className="mq-textarea"
                        placeholder="Type your thoughts here..."
                        value={review}
                        onChange={e => setReview(e.target.value)}
                        rows={4}
                    />
                    <button 
                        className="mq-next-btn" 
                        disabled={!review.trim()} 
                        onClick={() => setStep(2)}
                    >
                        Continue to Score
                    </button>
                </div>
            ) : (
                <div className="mq-step animate-fade">
                    <label className="mq-label">Define its Heritage Score</label>
                    <div className="mq-rating-selector">
                        <input 
                            type="range" 
                            min="1" max="10" 
                            step="0.1"
                            value={rating} 
                            onChange={e => setRating(parseFloat(e.target.value))}
                            className="mq-range"
                        />
                        <div className="mq-rating-display">
                            <span className="mq-rating-val">{rating.toFixed(1)}</span>
                            <span className="mq-rating-max">/ 10</span>
                        </div>
                    </div>
                    
                    <div className="mq-rating-hint">
                        {rating >= 9 ? "A timeless masterpiece." : 
                         rating >= 7 ? "An exceptional experience." : 
                         rating >= 5 ? "A worthy addition to the archive." : 
                         "A learning experience."}
                    </div>

                    <button className="mq-finish-btn" onClick={handleSubmit}>
                        Master & Archive Record
                    </button>
                    <button className="mq-back-link" onClick={() => setStep(1)}>
                        ← Research Review
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
