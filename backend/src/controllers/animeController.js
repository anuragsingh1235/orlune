const axios = require("axios");

/**
 * ─── ANIME CONTROLLER (Jikan API v4) ──────────────────────────────
 * Using Jikan, the open-source MyAnimeList API, to bring in high-end 
 * anime data without requiring keys.
 */

// Helper to map Jikan's structure to our internal 'MovieCard' structure
function jikanToOrlune(a) {
  return {
    id: a.mal_id,
    title: a.title_english || a.title,
    overview: a.synopsis || "No synopsis available in the archive.",
    poster_path: a.images?.webp?.large_image_url || a.images?.jpg?.large_image_url,
    backdrop_path: null,
    release_date: a.aired?.from ? a.aired.from.split('T')[0] : a.year?.toString(),
    vote_average: a.score || 0,
    genre_ids: a.genres?.map(g => g.name) || [],
    media_type: "anime",
    _api_source: "jikan"
  };
}

exports.getTrending = async (req, res) => {
  try {
    const response = await axios.get("https://api.jikan.moe/v4/top/anime", {
      timeout: 5000,
      params: { 
        filter: "bypopularity", // Standardizing for the 'Orlune' brand
        limit: 12
      }
    });

    const results = (response.data.data || []).map(jikanToOrlune);
    res.json(results);
  } catch (err) {
    console.error("Jikan API error:", err.message);
    res.status(500).json({ error: "Anime archive is currently offline." });
  }
};

exports.search = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime`, {
            timeout: 5000,
            params: { q, limit: 10 }
        });
        const results = (response.data.data || []).map(jikanToOrlune);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Search unavailable." });
    }
};
