const express  = require('express');
const router   = express.Router();
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const pool     = require('../config/database');
const auth     = require('../middleware/auth');

// ─── Load question bank (File I/O — mirrors Java's QuestionBank.loadFromFile) ─
const QUESTIONS_PATH = path.join(__dirname, '../data/questions.json');
let questionBank = [];

function loadQuestions() {
  try {
    const raw = fs.readFileSync(QUESTIONS_PATH, 'utf-8');
    questionBank = JSON.parse(raw);
    console.log(`✅ Trivia: loaded ${questionBank.length} questions`);
  } catch (e) {
    console.error('❌ Failed to load questions.json:', e.message);
    questionBank = [];
  }
}
loadQuestions();

// ─── In-memory session store (mirrors Java's QuizSession HashMap) ─────────────
const sessions = new Map();   // sessionId → session object

// ─── Helper: shuffle array ────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Helper: get questions by category ────────────────────────────────────────
function getQuestions(category = 'all', difficulty = 'all', count = 10) {
  let pool = [...questionBank];
  if (category !== 'all') pool = pool.filter(q => q.category === category);
  if (difficulty !== 'all') pool = pool.filter(q => q.difficulty === difficulty);
  return shuffle(pool).slice(0, count).map(q => {
    // Strip correct answer before sending to client
    const { correct, ...safe } = q;
    return safe;
  });
}

// ─── Helper: sanitize question for client (no answer) ─────────────────────────
function sanitize(q) {
  const { correct, ...safe } = q;
  return safe;
}

// ─── Ensure trivia table ──────────────────────────────────────────────────────
async function ensureTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trivia_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(100),
        score INTEGER DEFAULT 0,
        max_score INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 0,
        category VARCHAR(50),
        difficulty VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (e) { console.warn('Trivia table check:', e.message); }
}
ensureTable();

// ════════════════════════════════════════════════════════════
// POST /api/trivia/start
// ════════════════════════════════════════════════════════════
router.post('/start', (req, res) => {
  const { category = 'all', difficulty = 'all', count = 10 } = req.body;
  const sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
  const questions = getQuestions(category, difficulty, count);
  const fullQuestions = questions.map(q => questionBank.find(f => f.id === q.id));

  sessions.set(sessionId, {
    sessionId,
    category,
    difficulty,
    questions: fullQuestions,         // full (with correct answers) — server-side only
    answers:   {},                    // questionId → userAnswer
    score:     0,
    maxScore:  fullQuestions.reduce((s, q) => s + (q.points || 10), 0),
    streak:    0,
    bestStreak:0,
    startedAt: Date.now(),
    completed: false,
  });

  res.json({
    sessionId,
    questions: fullQuestions.map(sanitize),  // send without answers
    totalQuestions: fullQuestions.length,
    maxScore: sessions.get(sessionId).maxScore,
    timePerQuestion: 30,
  });
});

// ════════════════════════════════════════════════════════════
// POST /api/trivia/answer
// ════════════════════════════════════════════════════════════
router.post('/answer', (req, res) => {
  const { sessionId, questionId, answer } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.answers[questionId] !== undefined)
    return res.status(400).json({ error: 'Already answered' });

  const question = session.questions.find(q => q.id === questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  // Check answer (mirrors Java's question.checkAnswer())
  let correct = false;
  if (question.type === 'mcq') {
    correct = parseInt(answer) === question.correct;
  } else if (question.type === 'truefalse') {
    correct = (String(answer).toLowerCase() === 'true') === question.correct;
  }

  // Update session state (mirrors Java's QuizSession.submitAnswer())
  session.answers[questionId] = { userAnswer: answer, correct };
  if (correct) {
    session.score     += question.points;
    session.streak    += 1;
    session.bestStreak = Math.max(session.bestStreak, session.streak);
  } else {
    session.streak = 0;
  }

  res.json({
    correct,
    correctAnswer: question.type === 'mcq' ? question.correct : question.correct,
    explanation: question.explanation || null,
    score:       session.score,
    streak:      session.streak,
    bestStreak:  session.bestStreak,
    pointsEarned: correct ? question.points : 0,
  });
});

// ════════════════════════════════════════════════════════════
// GET /api/trivia/result/:sessionId
// ════════════════════════════════════════════════════════════
router.get('/result/:sessionId', async (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const answered = Object.keys(session.answers).length;
  const correct  = Object.values(session.answers).filter(a => a.correct).length;
  const pct      = Math.round((session.score / session.maxScore) * 100);

  let rank = null;
  try {
    const r = await pool.query(
      `SELECT COUNT(*)+1 AS rank FROM trivia_results WHERE score > $1 AND category = $2`,
      [session.score, session.category]
    );
    rank = parseInt(r.rows[0]?.rank) || null;
  } catch (_) {}

  session.completed = true;

  res.json({
    sessionId:    session.sessionId,
    score:        session.score,
    maxScore:     session.maxScore,
    percentage:   pct,
    correct,
    total:        session.questions.length,
    bestStreak:   session.bestStreak,
    category:     session.category,
    difficulty:   session.difficulty,
    timeTaken:    Math.round((Date.now() - session.startedAt) / 1000),
    rank,
    grade:        pct >= 90 ? 'S' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D',
  });
});

// ════════════════════════════════════════════════════════════
// POST /api/trivia/save  (authenticated — saves result to DB)
// ════════════════════════════════════════════════════════════
router.post('/save', auth, async (req, res) => {
  const { sessionId } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  try {
    await pool.query(
      `INSERT INTO trivia_results (user_id, username, score, max_score, streak, category, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, req.user.username, session.score, session.maxScore,
       session.bestStreak, session.category, session.difficulty]
    );
    res.json({ saved: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/trivia/leaderboard
// ════════════════════════════════════════════════════════════
router.get('/leaderboard', async (req, res) => {
  try {
    const { data } = await pool.query(
      `SELECT username, MAX(score) as best_score, COUNT(*) as attempts,
              MAX(streak) as best_streak, category
       FROM trivia_results
       GROUP BY username, category
       ORDER BY best_score DESC LIMIT 20`
    );
    res.json(data?.rows || []);
  } catch (e) {
    res.json([]);
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/trivia/categories
// ────────────────────────────────────────────────────────────
router.get('/categories', (req, res) => {
  const cats = ['all','hollywood','bollywood','anime','kdrama','directors'];
  const counts = {};
  cats.forEach(c => {
    counts[c] = c === 'all' ? questionBank.length : questionBank.filter(q => q.category === c).length;
  });
  res.json(cats.map(c => ({ id: c, label: c === 'all' ? '🌍 All' : c, count: counts[c] })));
});

module.exports = router;
