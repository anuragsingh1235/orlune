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
  };
}

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
    const results = (response.data.results || []).map((m) => ({ ...m, _api_source: "tmdb" }));
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
  const {
    tmdb_id,
    media_type,
    title,
    poster_path,
    backdrop_path,
    overview,
    release_date,
    vote_average,
    genres
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO watchlist_items 
      (user_id, tmdb_id, media_type, title, poster_path, backdrop_path, overview, release_date, vote_average, genres)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (user_id, tmdb_id, media_type) DO NOTHING RETURNING *`,
      [
        req.user.id,
        tmdb_id,
        media_type || 'movie',
        title,
        poster_path,
        backdrop_path,
        overview,
        release_date,
        vote_average,
        genres
      ]
    );

    if (!result.rows.length) {
      return res.status(409).json({ error: 'Already in watchlist' });
    }

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// 📥 GET WATCHLIST
exports.getItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM watchlist_items WHERE user_id=$1 ORDER BY id DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✏️ UPDATE ITEM
exports.updateItem = async (req, res) => {
  const { user_rating, user_review, status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE watchlist_items 
       SET user_rating=$1, user_review=$2, status=$3 
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [user_rating, user_review, status, req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ❌ REMOVE ITEM
exports.removeItem = async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM watchlist_items 
       WHERE id=$1 AND user_id=$2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Removed' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};