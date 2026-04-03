const axios = require("axios");

// ─── OMDB helpers ───────────────────────────────────────────────
// Normalize a *single* OMDB movie object into TMDB-shaped data
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

    // Extra OMDB-specific fields the frontend can optionally use
    omdb_ratings: o.Ratings || [],
    runtime: o.Runtime,
    director: o.Director,
    actors: o.Actors,
    awards: o.Awards,
    box_office: o.BoxOffice,
    rated: o.Rated,
  };
}

// ─── GET TRENDING (TMDB → OMDB fallback) ────────────────────────
exports.getTrending = async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;

  // 1) Try TMDB with a strict 3-second timeout
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${tmdbKey}`,
      { timeout: 3000 }
    );
    const results = (response.data.results || []).map((m) => ({
      ...m,
      _api_source: "tmdb",
    }));
    return res.json(results);
  } catch (tmdbErr) {
    console.warn("TMDB TRENDING failed/timed out, trying OMDB:", tmdbErr.message);
  }

  // 2) OMDB fallback — OMDB has no "trending" endpoint, so fetch a curated list
  if (omdbKey) {
    try {
      const popularTitles = [
        "Oppenheimer", "Dune", "Interstellar", "Inception", "The Batman", 
        "Spider-Man", "Avatar", "Top Gun", "Avengers", "The Dark Knight"
      ];

      const fetches = popularTitles.map((t) =>
        axios
          .get(`https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(t)}&type=movie`, { timeout: 3000 })
          .then((r) => r.data)
          .catch(() => null)
      );

      const raw = await Promise.all(fetches);
      const results = raw
        .filter((o) => o && o.Response === "True")
        .map(omdbToTmdb);

      return res.json(results);
    } catch (omdbErr) {
      console.error("OMDB TRENDING fallback also failed:", omdbErr.message);
    }
  }

  res.status(500).json({ error: "Both TMDB and OMDB failed" });
};

// ─── SEARCH (TMDB → OMDB fallback) ─────────────────────────────
exports.search = async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  const query = req.query.q;

  if (!query) return res.json([]);

  // 1) Try TMDB
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(query)}`,
      { timeout: 3000 }
    );
    const results = (response.data.results || []).map((m) => ({
      ...m,
      _api_source: "tmdb",
    }));
    return res.json(results);
  } catch (tmdbErr) {
    console.warn("TMDB SEARCH failed/timed out, trying OMDB:", tmdbErr.message);
  }

  // 2) OMDB fallback (search endpoint: s=)
  if (omdbKey) {
    try {
      const searchRes = await axios.get(
        `https://www.omdbapi.com/?apikey=${omdbKey}&s=${encodeURIComponent(query)}&type=movie`,
        { timeout: 3000 }
      );

      if (searchRes.data.Response === "True" && searchRes.data.Search) {
        // OMDB search only returns minimal info — enrich with full details (limit to 10 for speed)
        const detailFetches = searchRes.data.Search.slice(0, 10).map((s) =>
          axios
            .get(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${s.imdbID}&plot=short`, { timeout: 3000 })
            .then((r) => r.data)
            .catch(() => null)
        );

        const details = await Promise.all(detailFetches);
        const results = details
          .filter((o) => o && o.Response === "True")
          .map(omdbToTmdb);

        return res.json(results);
      }

      return res.json([]);
    } catch (omdbErr) {
      console.error("OMDB SEARCH fallback also failed:", omdbErr.message);
    }
  }

  res.status(500).json({ error: "Both TMDB and OMDB failed" });
};

// ─── GET DETAILS (TMDB → OMDB fallback) ────────────────────────
exports.getDetails = async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  const { id } = req.params;

  // 1) Try TMDB (id is numeric for TMDB)
  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbKey}`,
      { timeout: 3000 }
    );
    return res.json({ ...response.data, _api_source: "tmdb" });
  } catch (tmdbErr) {
    console.warn("TMDB DETAILS failed/timed out, trying OMDB:", tmdbErr.message);
  }

  // 2) OMDB fallback (id could be an IMDB id like tt1234567)
  if (omdbKey) {
    try {
      const param = String(id).startsWith("tt") ? `i=${id}` : `i=tt${id}`;
      const response = await axios.get(
        `https://www.omdbapi.com/?apikey=${omdbKey}&${param}&plot=full`,
        { timeout: 3000 }
      );

      if (response.data.Response === "True") {
        return res.json(omdbToTmdb(response.data));
      }
    } catch (omdbErr) {
      console.error("OMDB DETAILS fallback also failed:", omdbErr.message);
    }
  }

  res.status(500).json({ error: "Both TMDB and OMDB failed" });
};