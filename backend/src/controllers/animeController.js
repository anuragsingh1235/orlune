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
    // Jikan v4 top/anime uses 'filter' for popularity ranking.
    // 'bypopularity' is the standard for 'Trending' feel.
    const response = await axios.get("https://api.jikan.moe/v4/top/anime", {
      timeout: 8000,
      params: { 
        filter: "bypopularity", 
        sfw: true,
        limit: 12
      }
    });

    const results = (response.data.data || []).map(jikanToOrlune);
    res.json(results);
  } catch (err) {
    console.error("Jikan API error:", err.message);
    // If Jikan is down, return a hardcoded high-end list so the page isn't empty
    const fallback = [
        { id: 52991, title: "Frieren: Beyond Journey's End", vote_average: 9.4, poster_path: "https://cdn.myanimelist.net/images/anime/1015/138064l.jpg" },
        { id: 5114, title: "Fullmetal Alchemist: Brotherhood", vote_average: 9.1, poster_path: "https://cdn.myanimelist.net/images/anime/1223/96541l.jpg" },
        { id: 21, title: "One Piece", vote_average: 8.7, poster_path: "https://cdn.myanimelist.net/images/anime/6/73245l.jpg" }
    ].map(m => ({ ...m, _api_source: "jikan", media_type: "anime" }));
    
    res.json(fallback);
  }
};

exports.search = async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime`, {
            timeout: 8000,
            params: { 
                q, 
                limit: 15,
                sfw: true,
                order_by: "popularity"
            }
        });
        const results = (response.data.data || []).map(jikanToOrlune);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Search unavailable." });
    }
};
