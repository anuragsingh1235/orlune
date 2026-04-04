const axios = require("axios");

// ─── OMDB helpers ───────────────────────────────────────────────
// Normalize a *single* OMDB object (Movie/Series) into TMDB-shaped data
function omdbToTmdb(o) {
  return {
    id: o.imdbID,
    title: o.Title,
    overview: o.Plot && o.Plot !== "N/A" ? o.Plot : "No overview available from the archive.",
    poster_path: o.Poster && o.Poster !== "N/A" ? o.Poster : null,
    backdrop_path: null,
    release_date: o.Released && o.Released !== "N/A" ? o.Released : o.Year,
    vote_average: o.imdbRating && o.imdbRating !== "N/A" ? parseFloat(o.imdbRating) : 0,
    genre_ids: [],
    media_type: o.Type === "series" ? "tv" : "movie",
    _api_source: "omdb",

    // Extra OMDB-specific fields
    omdb_ratings: o.Ratings || [],
    runtime: o.Runtime,
    director: o.Director,
    actors: o.Actors,
    rated: o.Rated,
  };
}

// ─── GET TRENDING (TMDB → OMDB fallback) ────────────────────────
exports.getTrending = async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${tmdbKey}`,
      { timeout: 4000 }
    );
    const results = (response.data.results || []).map((m) => ({ ...m, _api_source: "tmdb" }));
    return res.json(results);
  } catch (tmdbErr) {
    if (omdbKey) {
      try {
        const popularTitles = ["Oppenheimer", "Dune: Part Two", "Interstellar", "The Dark Knight", "Inception"];
        const fetches = popularTitles.map((t) =>
          axios.get(`https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(t)}`, { timeout: 4000 })
            .then((r) => r.data)
            .catch(() => null)
        );
        const raw = await Promise.all(fetches);
        const results = raw.filter((o) => o && o.Response === "True").map(omdbToTmdb);
        return res.json(results);
      } catch (omdbErr) {
        return res.status(500).json({ error: "High-load on data servers. Please retry." });
      }
    }
  }
  res.status(500).json({ error: "Service unavailable." });
};

// ─── SEARCH (Unified TMDB/OMDB) ──────────────────────────────────
exports.search = async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  const query = req.query.q;

  if (!query) return res.json([]);

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(query)}`,
      { timeout: 4000 }
    );
    const results = (response.data.results || []).map((m) => ({ ...m, _api_source: "tmdb" }));
    if (results.length > 0) return res.json(results);
  } catch (tmdbErr) {
    // Silent fail over to OMDB
  }

  if (omdbKey) {
    try {
      // NOTE: Removed `&type=movie` to allow both series and movies as requested.
      const searchRes = await axios.get(
        `https://www.omdbapi.com/?apikey=${omdbKey}&s=${encodeURIComponent(query)}`,
        { timeout: 4000 }
      );

      if (searchRes.data.Response === "True" && searchRes.data.Search) {
        const detailFetches = searchRes.data.Search.slice(0, 8).map((s) =>
          axios.get(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${s.imdbID}&plot=short`, { timeout: 4000 })
            .then((r) => r.data)
            .catch(() => null)
        );
        const details = await Promise.all(detailFetches);
        return res.json(details.filter((o) => o && o.Response === "True").map(omdbToTmdb));
      }
    } catch (omdbErr) {
      // Final fallback
    }
  }
  res.json([]);
};

// ─── GET DETAILS ────────────────────────────────────────────────
exports.getDetails = async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  const { id } = req.params;

  try {
    // If numeric, it's likely TMDB. If starts with 'tt', it's IMDB.
    const isImdb = String(id).startsWith("tt");
    if (!isImdb) {
      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbKey}`,
        { timeout: 4000 }
      );
      return res.json({ ...response.data, _api_source: "tmdb" });
    }
  } catch (tmdbErr) { /* fallback... */ }

  if (omdbKey) {
    try {
      const param = String(id).startsWith("tt") ? `i=${id}` : `i=tt${id}`;
      const response = await axios.get(
        `https://www.omdbapi.com/?apikey=${omdbKey}&${param}&plot=full`,
        { timeout: 4000 }
      );
      if (response.data.Response === "True") {
        return res.json(omdbToTmdb(response.data));
      }
    } catch (omdbErr) {}
  }
  res.status(404).json({ error: "Item not found in any archive." });
};