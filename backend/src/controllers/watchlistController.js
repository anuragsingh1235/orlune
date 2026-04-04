const pool = require('../config/database');
const axios = require("axios");

// Normalize OMDB → TMDB shape
function omdbToTmdb(o) {
  return {
    id: o.imdbID,
    title: o.Title,
    overview: o.Plot && o.Plot !== "N/A" ? o.Plot : "",
    poster_path: o.Poster && o.Poster !== "N/A" ? o.Poster : null,
    backdrop_path: null,
    release_date: o.Released && o.Released !== "N/A" ? o.Released : o.Year,
    vote_average: o.imdbRating && o.imdbRating !== "N/A" ? parseFloat(o.imdbRating) : 0,
    genre_ids: [],
    media_type: "movie",
    _api_source: "omdb",
    _id: `omdb_${o.imdbID}`
  };
}

// Ensure the table reflects our cinematic vision
const ensureSchema = async () => {
    try {
        await pool.query('ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'watchlist\'');
        await pool.query('ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS heritage_score NUMERIC');
        await pool.query('ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS user_review TEXT');
        await pool.query('ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP');
    } catch(err) {
        console.warn("Schema check failed but proceeding:", err.message);
    }
};

// 🔍 SEARCH (TMDB → OMDB fallback)
exports.search = async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  const query = req.query.q;

  if (!query) return res.json([]);

  // 1) Try TMDB
  try {
    const response = await axios.get(
      "https://api.themoviedb.org/3/search/movie",
      { params: { api_key: tmdbKey, query }, timeout: 3000 }
    );
    const results = (response.data.results || []).map((m) => ({ ...m, _api_source: "tmdb", _id: `tmdb_${m.id}` }));
    return res.json(results);
  } catch (tmdbErr) {
    console.warn("TMDB WATCHLIST SEARCH failed/timed out, trying OMDB:", tmdbErr.message);
  }

  // 2) OMDB fallback
  if (omdbKey) {
    try {
      const searchRes = await axios.get(
        `https://www.omdbapi.com/?apikey=${omdbKey}&s=${encodeURIComponent(query)}&type=movie`,
        { timeout: 3000 }
      );
      if (searchRes.data.Response === "True" && searchRes.data.Search) {
        const detailFetches = searchRes.data.Search.slice(0, 10).map((s) =>
          axios.get(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${s.imdbID}&plot=short`, { timeout: 3000 })
            .then((r) => r.data).catch(() => null)
        );
        const details = await Promise.all(detailFetches);
        return res.json(details.filter((o) => o && o.Response === "True").map(omdbToTmdb));
      }
      return res.json([]);
    } catch (omdbErr) {
      console.error("OMDB WATCHLIST SEARCH also failed:", omdbErr.message);
    }
  }

  res.status(500).json({ error: "Search error" });
};

// ➕ ADD TO WATCHLIST
exports.addItem = async (req, res) => {
  await ensureSchema();
  const { tmdb_id, media_type, title, poster_path, backdrop_path, overview, release_date, vote_average, genres } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO watchlist_items 
      (user_id, tmdb_id, media_type, title, poster_path, backdrop_path, overview, release_date, vote_average, genres, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, 'watchlist')
      ON CONFLICT (user_id, tmdb_id, media_type) DO NOTHING RETURNING *`,
      [req.user.id, tmdb_id, media_type || 'movie', title, poster_path, backdrop_path, overview, release_date, parseFloat(vote_average) || 0, genres]
    );

    if (!result.rows.length) return res.status(409).json({ error: 'Already in watchlist' });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("ADD ITEM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// 📥 GET WATCHLIST
exports.getItems = async (req, res) => {
  await ensureSchema();
  try {
    const result = await pool.query(
      `SELECT * FROM watchlist_items WHERE user_id=$1 ORDER BY id DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET ITEMS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✏️ UPDATE ITEM
exports.updateItem = async (req, res) => {
  await ensureSchema();
  const { heritage_score, user_review, status } = req.body;
  const ratingVal = heritage_score != null ? parseFloat(heritage_score) : null;

  try {
    let result;
    if (status === 'completed') {
      result = await pool.query(
        `UPDATE watchlist_items 
         SET heritage_score=$1, user_review=$2, status=$3, completed_at=NOW() 
         WHERE id=$4 AND user_id=$5 RETURNING *`,
        [ratingVal, user_review, status, req.params.id, req.user.id]
      );
    } else {
      result = await pool.query(
        `UPDATE watchlist_items 
         SET heritage_score=$1, user_review=$2, status=$3 
         WHERE id=$4 AND user_id=$5 RETURNING *`,
        [ratingVal, user_review, status, req.params.id, req.user.id]
      );
    }

    if (!result.rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ❌ REMOVE ITEM
exports.removeItem = async (req, res) => {
  try {
    const checkQuery = await pool.query(
      "SELECT status, completed_at FROM watchlist_items WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );

    if (!checkQuery.rows.length) return res.status(404).json({ error: 'Item not found' });
    const item = checkQuery.rows[0];

    if (item.status === 'completed' && item.completed_at) {
      const diffDays = (new Date() - new Date(item.completed_at)) / (1000 * 60 * 60 * 24);
      if (diffDays < 2) {
        return res.status(403).json({ error: `Great legacy takes time. Mastered records can only be removed after 48 hours. (${Math.ceil((2 - diffDays) * 24)}h left)` });
      }
    }

    await pool.query("DELETE FROM watchlist_items WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error("REMOVE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// 🏛️ GET COMMUNITY RATINGS
exports.getCommunityRatings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT title, poster_path, media_type, tmdb_id,
              AVG(CAST(heritage_score AS FLOAT)) as avg_community_rating,
              COUNT(heritage_score) as total_ratings
       FROM watchlist_items 
       WHERE heritage_score IS NOT NULL AND status='completed'
       GROUP BY title, poster_path, media_type, tmdb_id
       HAVING COUNT(heritage_score) > 0
       ORDER BY avg_community_rating DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("COMMUNITY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};