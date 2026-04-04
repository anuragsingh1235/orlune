const axios = require("axios");

/**
 * ─── OMDB & YOUTUBE HELPERS ──────────────────────────────────────
 */

// Normalize OMDB -> TMDB-shaped
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
    runtime: o.Runtime,
    director: o.Director,
    actors: o.Actors,
    rated: o.Rated,
  };
}

// Search YouTube for a trailer using the provided API Key
async function getYoutubeTrailer(title, year = "") {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const query = encodeURIComponent(`${title} ${year} official trailer`);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoEmbeddable=true&maxResults=1&key=${apiKey}`;
    const response = await axios.get(url, { timeout: 4000 });
    
    if (response.data.items?.length > 0) {
      return response.data.items[0].id.videoId;
    }
  } catch (err) {
    console.error("YouTube search error:", err.message);
  }
  return null;
}

/**
 * ─── CONTROLLER EXPORTS ──────────────────────────────────────────
 */

exports.getTrending = async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${tmdbKey}`,
      { timeout: 4000 }
    );
    return res.json((response.data.results || []).map((m) => ({ ...m, _api_source: "tmdb" })));
  } catch (tmdbErr) {
    if (omdbKey) {
      try {
        const popularTitles = ["Oppenheimer", "Dune: Part Two", "Interstellar", "Inception"];
        const fetches = popularTitles.map((t) =>
          axios.get(`https://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(t)}`, { timeout: 4000 })
            .then((r) => r.data).catch(() => null)
        );
        const raw = await Promise.all(fetches);
        return res.json(raw.filter((o) => o && o.Response === "True").map(omdbToTmdb));
      } catch (omdbErr) {
        return res.status(500).json({ error: "Service unavailable." });
      }
    }
  }
  res.status(500).json({ error: "Fetch failed." });
};

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
  } catch (tmdbErr) {}

  if (omdbKey) {
    try {
      const searchRes = await axios.get(
        `https://www.omdbapi.com/?apikey=${omdbKey}&s=${encodeURIComponent(query)}`,
        { timeout: 4000 }
      );
      if (searchRes.data.Response === "True" && searchRes.data.Search) {
        const detailFetches = searchRes.data.Search.slice(0, 8).map((s) =>
          axios.get(`https://www.omdbapi.com/?apikey=${omdbKey}&i=${s.imdbID}&plot=short`, { timeout: 4000 })
            .then((r) => r.data).catch(() => null)
        );
        const details = await Promise.all(detailFetches);
        return res.json(details.filter((o) => o && o.Response === "True").map(omdbToTmdb));
      }
    } catch (omdbErr) {}
  }
  res.json([]);
};

// ENHANCED DETAIL FETCH (Now includes Trailer Search)
exports.getDetails = async (req, res) => {
  const tmdbKey = process.env.TMDB_API_KEY;
  const omdbKey = process.env.OMDB_API_KEY;
  const { id } = req.params;
  const mediaType = req.query.type || 'movie';

  let data = null;
  let source = 'tmdb';

  try {
    const isImdb = String(id).startsWith("tt");
    if (!isImdb) {
      // 1) Fetch from TMDB
      const response = await axios.get(
        `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${tmdbKey}&append_to_response=videos,credits`,
        { timeout: 4000 }
      );
      data = response.data;
      source = 'tmdb';
    } else if (omdbKey) {
      // 2) Fetch from OMDB
      const response = await axios.get(
        `https://www.omdbapi.com/?apikey=${omdbKey}&i=${id}&plot=full`,
        { timeout: 4000 }
      );
      if (response.data.Response === "True") {
        data = omdbToTmdb(response.data);
        source = 'omdb';
      }
    }
  } catch (err) {
    console.error("Detail fetch error:", err.message);
  }

  if (!data) return res.status(404).json({ error: "Narrative not found." });

  // ── TRAILER DISCOVERY ──
  let trailerId = null;
  
  // A) Match from TMDB videos
  if (source === 'tmdb' && data.videos?.results) {
    const officialTrailer = data.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    trailerId = officialTrailer?.key;
  }

  // B) Power Search via YouTube API (Fallback for TMDB/Main for OMDB)
  if (!trailerId) {
    const title = data.title || data.name;
    const year = (data.release_date || data.first_air_date || "").slice(0, 4);
    trailerId = await getYoutubeTrailer(title, year);
  }

  res.json({ ...data, trailerId, _api_source: source });
};