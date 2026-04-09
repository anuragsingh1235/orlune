const pool = require('../config/database');
const axios = require('axios');

const TMDB = 'https://api.themoviedb.org/3';
const TMDB_KEY = process.env.TMDB_API_KEY;
const COLORS = ['#e50914','#0095f6','#a855f7','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// TMDB Genre IDs
const GENRE_IDS = {
  action: 28, romance: 10749, thriller: 53, horror: 27,
  'sci-fi': 878, comedy: 35, drama: 18, animation: 16, crime: 80
};

// ─── UPCOMING MOVIES ───────────────────────────────────────────────
exports.getUpcoming = async (req, res) => {
  try {
    const { genre } = req.query;
    const g = (genre || 'all').toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let url;
    const base = `${TMDB}/discover/movie?api_key=${TMDB_KEY}&language=en-US&sort_by=release_date.asc&include_adult=false&primary_release_date.gte=${today}&primary_release_date.lte=${future}`;
    const tvBase = `${TMDB}/discover/tv?api_key=${TMDB_KEY}&language=en-US&sort_by=first_air_date.asc&first_air_date.gte=${today}&first_air_date.lte=${future}`;

    if (g === 'hollywood')       url = `${base}&with_original_language=en&region=US`;
    else if (g === 'bollywood')  url = `${base}&with_original_language=hi|te|ta|ml|kn&region=IN`;
    else if (g === 'kdrama')     url = `${tvBase}&with_original_language=ko`;
    else if (g === 'cdrama')     url = `${tvBase}&with_original_language=zh`;
    else if (g === 'anime')      url = `${tvBase}&with_original_language=ja&with_genres=16`;
    else if (GENRE_IDS[g])       url = `${base}&with_genres=${GENRE_IDS[g]}`;
    else                         url = `${base}&region=US`; 

    const r = await axios.get(url);
    const results = (r.data.results || []).map(m => ({
        ...m,
        title: m.title || m.name,
        release_date: m.release_date || m.first_air_date,
        media_type: g === 'anime' || g === 'cdrama' || g === 'kdrama' ? 'tv' : 'movie'
    }));
    res.json({ results });
  } catch (err) {
    console.error('Upcoming error:', err.message);
    res.status(500).json({ error: 'Failed to fetch upcoming' });
  }
};

// ─── TODAY'S RELEASES ──────────────────────────────────────────────
exports.getTodayReleased = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [mv, tv] = await Promise.all([
      axios.get(`${TMDB}/discover/movie?api_key=${TMDB_KEY}&primary_release_date.gte=${today}&primary_release_date.lte=${today}&language=en-US`),
      axios.get(`${TMDB}/discover/tv?api_key=${TMDB_KEY}&first_air_date.gte=${today}&first_air_date.lte=${today}&language=en-US`)
    ]);
    
    const results = [
        ...(mv.data.results || []).map(m => ({ ...m, media_type: 'movie' })),
        ...(tv.data.results || []).map(m => ({ ...m, media_type: 'tv', title: m.name, release_date: m.first_air_date }))
    ];
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
};

// ─── REMINDERS ────────────────────────────────────────────────────
exports.toggleReminder = async (req, res) => {
  const { tmdb_id, media_type, title, release_date, poster_path } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;
  try {
    const exists = await pool.query(
      'SELECT id FROM upcoming_reminders WHERE user_id=$1 AND tmdb_id=$2',
      [userId, tmdb_id]
    );
    if (exists.rows.length) {
      await pool.query('DELETE FROM upcoming_reminders WHERE user_id=$1 AND tmdb_id=$2', [userId, tmdb_id]);
      return res.json({ active: false, message: 'Reminder removed' });
    }
    await pool.query(
      `INSERT INTO upcoming_reminders (user_id, tmdb_id, media_type, title, release_date, poster_path, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId, tmdb_id, media_type || 'movie', title, release_date, poster_path, userEmail]
    );
    res.json({ active: true, message: 'Reminder set! You\'ll get an email when it releases.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle reminder' });
  }
};

exports.getMyReminders = async (req, res) => {
  try {
    const r = await pool.query('SELECT tmdb_id FROM upcoming_reminders WHERE user_id=$1', [req.user.id]);
    res.json({ reminders: r.rows.map(r => r.tmdb_id) });
  } catch {
    res.json({ reminders: [] });
  }
};

// ─── MOVIE RATINGS ────────────────────────────────────────────────
exports.submitRating = async (req, res) => {
  const { tmdb_id, media_type, title, rating } = req.body;
  const userId = req.user.id;
  try {
    const existing = await pool.query('SELECT * FROM movie_ratings WHERE user_id=$1 AND tmdb_id=$2', [userId, tmdb_id]);
    if (existing.rows.length) {
      const r = existing.rows[0];
      if (r.submit_count >= 2) return res.status(403).json({ error: 'Max 2 ratings allowed', submitCount: r.submit_count });
      await pool.query(
        'UPDATE movie_ratings SET rating=$1, submit_count=submit_count+1, updated_at=NOW() WHERE user_id=$2 AND tmdb_id=$3',
        [rating, userId, tmdb_id]
      );
      return res.json({ submitCount: r.submit_count + 1, isLastChance: false });
    }
    await pool.query(
      `INSERT INTO movie_ratings (user_id, tmdb_id, media_type, title, rating) VALUES ($1,$2,$3,$4,$5)`,
      [userId, tmdb_id, media_type || 'movie', title, rating]
    );
    res.json({ submitCount: 1, isLastChance: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

exports.getMovieRatings = async (req, res) => {
  const { tmdb_id } = req.params;
  try {
    const r = await pool.query(
      'SELECT AVG(rating)::numeric(4,1) as avg_rating, COUNT(*) as count FROM movie_ratings WHERE tmdb_id=$1',
      [tmdb_id]
    );
    let userRating = null;
    let userSubmitCount = 0;
    if (req.user) {
      const ur = await pool.query('SELECT rating, submit_count FROM movie_ratings WHERE user_id=$1 AND tmdb_id=$2', [req.user.id, tmdb_id]);
      if (ur.rows.length) { userRating = ur.rows[0].rating; userSubmitCount = ur.rows[0].submit_count; }
    }
    res.json({ avgRating: parseFloat(r.rows[0].avg_rating) || 0, count: parseInt(r.rows[0].count), userRating, userSubmitCount });
  } catch {
    res.status(500).json({ error: 'Failed to get ratings' });
  }
};

// ─── ARENA CHALLENGES ─────────────────────────────────────────────
exports.getArenaFeed = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ac.*, 
        c.username as creator_name, c.avatar_url as creator_avatar,
        o.username as opponent_name, o.avatar_url as opponent_avatar
       FROM arena_challenges ac
       JOIN users c ON ac.creator_id = c.id
       LEFT JOIN users o ON ac.opponent_id = o.id
       WHERE ac.status IN ('pending','active','completed')
       ORDER BY ac.created_at DESC LIMIT 30`
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch arena' });
  }
};

exports.createChallenge = async (req, res) => {
  const { genre, opponentId, creatorMovieId, creatorMovieTitle, creatorMoviePoster } = req.body;
  const creatorColor = randomColor();
  let opponentColor = randomColor();
  while (opponentColor === creatorColor) opponentColor = randomColor();
  try {
    const r = await pool.query(
      `INSERT INTO arena_challenges (
        creator_id, opponent_id, genre, 
        creator_movie_id, creator_movie_title, creator_movie_poster,
        creator_color, opponent_color
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.user.id, opponentId || null, genre || 'All', 
        creatorMovieId, creatorMovieTitle, creatorMoviePoster,
        creatorColor, opponentColor
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('Create challenge error:', err.message);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
};

exports.respondChallenge = async (req, res) => {
  const { action } = req.body; // 'accept' | 'ignore'
  try {
    if (action === 'ignore') {
      await pool.query('UPDATE arena_challenges SET status=$1 WHERE id=$2', ['declined', req.params.id]);
      return res.json({ status: 'declined' });
    }
    const ends = new Date(); ends.setHours(ends.getHours() + 24);
    const r = await pool.query(
      `UPDATE arena_challenges SET status='active', opponent_id=$1, ends_at=$2 WHERE id=$3 AND status='pending' RETURNING *`,
      [req.user.id, ends, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Challenge not found' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to respond' });
  }
};

exports.selectMovie = async (req, res) => {
  const { movie_id, movie_title, movie_poster } = req.body;
  try {
    const ch = await pool.query('SELECT * FROM arena_challenges WHERE id=$1', [req.params.id]);
    if (!ch.rows.length) return res.status(404).json({ error: 'Not found' });
    const c = ch.rows[0];
    let field;
    if (c.creator_id === req.user.id) field = 'creator';
    else if (c.opponent_id === req.user.id) field = 'opponent';
    else return res.status(403).json({ error: 'Not a participant' });
    const r = await pool.query(
      `UPDATE arena_challenges SET ${field}_movie_id=$1, ${field}_movie_title=$2, ${field}_movie_poster=$3 WHERE id=$4 RETURNING *`,
      [movie_id, movie_title, movie_poster, req.params.id]
    );
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error: 'Failed to select movie' });
  }
};

exports.voteChallenge = async (req, res) => {
  const { votedFor } = req.body; // 'creator' | 'opponent'
  try {
    const ch = await pool.query('SELECT * FROM arena_challenges WHERE id=$1 AND status=$2', [req.params.id, 'active']);
    if (!ch.rows.length) return res.status(404).json({ error: 'Active challenge not found' });
    const c = ch.rows[0];
    const votedForId = votedFor === 'creator' ? c.creator_id : c.opponent_id;
    await pool.query(
      `INSERT INTO arena_votes (challenge_id, voter_id, voted_for) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id, votedForId]
    );
    const votes = await pool.query(
      `SELECT voted_for, COUNT(*) as count FROM arena_votes WHERE challenge_id=$1 GROUP BY voted_for`,
      [req.params.id]
    );
    let creatorVotes = 0, opponentVotes = 0;
    for (const v of votes.rows) {
      if (parseInt(v.voted_for) === c.creator_id) creatorVotes = parseInt(v.count);
      else opponentVotes = parseInt(v.count);
    }
    await pool.query('UPDATE arena_challenges SET creator_votes=$1, opponent_votes=$2 WHERE id=$3', [creatorVotes, opponentVotes, req.params.id]);
    res.json({ creatorVotes, opponentVotes });
  } catch {
    res.status(500).json({ error: 'Failed to vote' });
  }
};

exports.getMyArenaVote = async (req, res) => {
  try {
    const r = await pool.query('SELECT voted_for FROM arena_votes WHERE challenge_id=$1 AND voter_id=$2', [req.params.id, req.user.id]);
    res.json({ voted: r.rows.length > 0, votedFor: r.rows[0]?.voted_for });
  } catch {
    res.json({ voted: false });
  }
};
